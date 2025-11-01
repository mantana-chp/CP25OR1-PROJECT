export interface IApiResponse<T> {
  status: {
    code: string
    description: string
  }
  data: T // The 'data' key holds the actual content
}
