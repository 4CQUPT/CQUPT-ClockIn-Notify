# CQUPT-ClockIn-Notify

## 事先申明

1. 本脚本获取打卡数据的方式不被官方支持，随时可能失效。
2. 本脚本仅用于提醒同学打卡，请勿用作其他用途。
3. 原则上我不不会提供任何技术支持，请自行探索。

## 脚本作用

自动获取未打卡数据，并在 QQ 群 @ 对应的同学。推送时间为 12，15，18，19，20，21，22。

## 工作原理

### 1. 如何获取打卡数据？

正常情况下只有辅导员才能获取到打卡数据，不管是内网网站，还是 We 重邮。内网无法在服务器运行，We 重邮需要用辅导员微信去抓包。打卡时，我通过抓包发现，打开 We 重邮打开页面时会发送一个 POST 请求，得到此人是否打卡的信息，从而在前端阻止重复打卡，这其实有点蠢，不过倒是提供了一个判断是否打卡的接口。

![是否打卡](assets/p1.jpg)

然后就把所有人的学号拿进去扫描一遍就行了，该 POST 请求目前没有要求限制是否是本人，不排除以后会。如果 We 重邮的人看到了，建议自己好好想想为什么会有这么个脚本。

### 2. 如何存储数据？

为了减少每次扫描的次数，需要将没有打卡的数据存储下来。由于我是部署到了[腾讯云函数](https://console.cloud.tencent.com/scf)，只能使用在线数据库，我这里用的[维格表](https://vika.cn/)，相当于数据库。表头如下，数据自行获取。数据类型

```ts
{
    id: string,
    name: string,
    qq: string,
    clocked: boolean
}
```

![维格表](assets/p2.png)
如果是服务器，直接一个 json 文件就行。

### 3. 如何推送消息，实现 @？

我这里使用的 [Qmsg](https://qmsg.zendee.cn/api.html)，一个 Get 请求即可将信息推送到 QQ 群，十分方便。你需要做的就是获取每个人的 QQ 号一一对应。

## 如何使用

1. 初始化环境
   ```shell
   > git clone https://github.com/4CQUPT/CQUPT-ClockIn-Notify.git
   > cd CQUPT-ClockIn-Notify
   > mv src/option.ts_ src/option.ts
   > pnpm i
   ```
2. 获取数据，建立数据库
3. 修改 option.ts，具体细节我已写明
4. 打包，上传到腾讯云函数
   ```shell
   pnpm build
   ```
   可以直接上传 `dist` 文件夹
