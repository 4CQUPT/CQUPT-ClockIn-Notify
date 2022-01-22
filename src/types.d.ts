export type VikaResponse = {
  code: number
  success: boolean
  data: {
    total: number
    pageNum: number
    pageSize: number
    records: {
      recordId: string
      // timestamp
      createdAt: number
      updatedAt: number
      fields: {
        id: string
        name: string
        clocked: boolean
        qq: string
      }
    }[]
  }
}
export type WeResponse = {
  status: number
  message: string
  data: { count: "0" | "1" }
}
export type QmsgResponse = {
  success: boolean
  reason: string
}
export type IStu = {
  recordId: string
  id: string
  name: string
  clocked: boolean
  qq: string
}
