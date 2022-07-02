// extends Express response method
// @see https://stackoverflow.com/a/40762463/831243
declare namespace Express {
  export interface Response {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ok(data: any): Send<ResBody, this>;
    error(message: string, status = 500, errors?: string[]): void;
  }
}
