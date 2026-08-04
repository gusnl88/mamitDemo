export interface ApiResponse<T = unknown> {
  errorCode: string | null;
  errorMessage: string | null;
  requestId: string | null;
  result: T;
  success: boolean;
}

export class ApiError extends Error {
  code: string | null;
  requestId: string | null;

  constructor(message: string, code: string | null, requestId: string | null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.requestId = requestId;
  }
}
