export interface PagedResult<T> {
  totalPages: number;
  results: T[];
}

export interface CursoredResult<T> {
  results: T;
  cursorState: string;
}

export class PagingOptions {
  pageNumber = 1;
  pageSize = 25;

  constructor(pageNumber: number, pageSize: number) {
    this.pageNumber = pageNumber;
    this.pageSize = pageSize;
  }
}
