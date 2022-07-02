export class CommonError extends Error {
  readonly message: string;
  readonly status: number;
  readonly errors!: string[];

  constructor(message: string, status = 500, errors?: string[]) {
    super(message);

    this.status = status;
    this.message = message;
    if (errors) {
      this.errors = errors;
    }
  }
}
