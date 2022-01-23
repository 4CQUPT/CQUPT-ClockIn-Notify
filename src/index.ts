import got from "got"
import queryString from "query-string"
import option from "option"
import { WeResponse, IStu, VikaResponse, QmsgResponse } from "types"

const gotOption = {
  timeout: {
    request: 3000
  },
  retry: {
    limit: 5
  }
}

class Vika {
  url: string
  token: string
  constructor(datasheetId: string, token: string) {
    this.url = `https://api.vika.cn/fusion/v1/datasheets/${datasheetId}/records?fieldKey=name`
    this.token = token
  }
  async get(range: "all" | "clocked" | "not" = "all"): Promise<IStu[]> {
    try {
      const res = (await got
        .get(this.url, {
          headers: {
            Authorization: "Bearer " + this.token
          },
          searchParams: queryString.stringify({
            fields: ["id", "name", "qq", "clocked"],
            pageSize: 300
          }),
          ...gotOption
        })
        .json()) as VikaResponse
      if (res.success) {
        const table = res.data.records.map(k => ({
          ...k.fields,
          recordId: k.recordId
        }))
        switch (range) {
          case "all":
            return table
          case "clocked":
            return table.filter(k => k.clocked)
          case "not":
            return table.filter(k => !k.clocked)
        }
      } else throw "Vika: 查询失败"
    } catch (err) {
      console.log(err)
      return []
    }
  }
  async update(students: IStu[], clocked: boolean) {
    // 每次只能更新 10 个
    const update10 = async (students: IStu[]) => {
      await got.patch(this.url, {
        headers: {
          Authorization: "Bearer " + this.token
        },
        json: {
          fieldKey: "name",
          records: students.map(k => ({
            recordId: k.recordId,
            fields: {
              clocked: clocked
            }
          }))
        },
        ...gotOption
      })
    }
    try {
      for (let i = 0, len = students.length; i < len; i += 10) {
        await update10(students.slice(i, i + 10))
      }
    } catch (err) {}
  }
}

const checkClock = async (
  students: IStu[]
): Promise<{
  unClock: IStu[]
  clocked: IStu[]
}> => {
  const check1 = async (stu: IStu) =>
    (await got
      .post("https://we.cqupt.edu.cn/api/mrdk/get_mrdk_flag.php", {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.4"
        },
        ...gotOption,
        json: {
          key: Buffer.from(
            JSON.stringify({
              xh: stu.id,
              timestamp: Math.floor(Date.now() / 1000)
            })
          ).toString("base64")
        }
      })
      .json()) as WeResponse

  const unClock: IStu[] = []
  const clocked: IStu[] = []

  // 全部扫描一遍
  while (students.length) {
    const stu = students[0]
    students.shift()
    try {
      const res = await check1(stu)
      if (res.status !== 200) throw "打卡查询失败，稍后重试"
      if (res.data.count == "0") {
        unClock.push(stu)
        console.log(stu.name + " ".repeat(10 - stu.name.length * 2) + "x")
      } else {
        clocked.push(stu)
        console.log(stu.name + " ".repeat(10 - stu.name.length * 2) + "✓")
      }
    } catch (err) {
      students.push(stu)
    }
  }
  return {
    clocked,
    unClock
  }
}

const push = async (textList: string[], opt: { type: string; num: string }) => {
  // 每次只能 @10 个人
  const push10 = async (text: string) =>
    (await got
      .post(
        `https://qmsg.zendee.cn/${opt.type == "group" ? "group" : "send"}/${
          option.qmsg.token
        }`,
        {
          ...gotOption,
          form: {
            msg: text,
            qq: opt.num
          }
        }
      )
      .json()) as QmsgResponse

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  for (let i = 0, len = textList.length; i < len; i++) {
    try {
      // 需要间隔 5s
      if (i) await delay(5000)
      const res = await push10(textList[i])
      if (!res.success) throw res.reason
    } catch (err) {
      console.log(err)
    }
  }
}

const genPushText = (date: Date, unClock: IStu[]): string[] => {
  let text = `截止到 ${date.getHours()}:${String(date.getMinutes()).padStart(
    2,
    "0"
  )}，`
  if (unClock.length) {
    text += `共有 ${unClock.length} 人未打卡。\n`
    const list = unClock
      .sort((m, n) => (m.id > n.id ? 1 : -1))
      .map((stu, index) => `${index + 1}. ${stu.name} @at=${stu.qq}@`)
    const res = [text + list.slice(0, 10).join("\n")]
    // 每 10 个一组，因为每次只能 @10 个人
    for (let i = 10, len = list.length; i < len; i += 10) {
      res.push(list.slice(i, i + 10).join("\n"))
    }
    return res
  } else {
    text += "全部打卡完毕，感谢大家配合，请尽量在中午 12 点前完成打卡。"
    return [text]
  }
}

// 腾讯云入口函数
export const main_handler = async (event?: any, context?: any) => {
  // 北京时间
  const date = new Date(
    Date.now() + (new Date().getTimezoneOffset() + 8 * 60) * 60 * 1000
  )
  const db = new Vika(option.vika.datasheetId, option.vika.token)
  if (date.getHours() === option.time.reset) {
    const table = await db.get("all")
    // 把昨天没打卡的重置为已打卡
    await db.update(
      table.filter(k => !k.clocked),
      true
    )
    const { unClock } = await checkClock(table)
    await push(
      [`打卡通知初始化成功，当前有 ${unClock.length} 人未打卡`],
      option.qmsg.dev
    )
    // 更新没打卡的人
    await db.update(unClock, false)
  } else {
    const table = await db.get("not")
    if (!table.length) return
    const { unClock, clocked } = await checkClock(table)
    // 推送未打卡的人
    if (option.time.push.includes(date.getHours()))
      await push(genPushText(date, unClock), option.qmsg.prod)
    // 更新已打卡的人
    await db.update(clocked, true)
  }
}

// 测试
// main_handler()
