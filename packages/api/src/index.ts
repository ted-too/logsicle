export interface Opts extends RequestInit {
  baseURL: string;
}

export interface ErrorResponse {
  message: string;
  error: string;
}

export type FnResponse<T> =
  | {
      data: T;
      error: null;
    }
  | {
      data: null;
      error: ErrorResponse;
    };

export * from "./routes";
