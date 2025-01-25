export class HttpError extends Error {
  status: number;
  message: string;
  timestamp?: string;
  path?: string;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data?: T;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  total: number;
}
