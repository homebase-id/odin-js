export interface PagedResult<T> {
  totalPages: number;
  results: T[];
}

export interface CursoredResult<T> {
  results: T;
  cursorState: string;
}

export interface NumberCursoredResult<T> {
  results: T[];
  cursor: number;
}

export interface MultiRequestCursoredResult<T> {
  results: T;
  cursorState: Record<string, string>;
}

export interface PagingOptions {
  pageNumber: number;
  pageSize: number;
}
