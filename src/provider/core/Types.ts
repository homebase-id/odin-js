export interface PagedResult<T> {
  totalPages: number;
  results: T[];
}

export class PagingOptions {
  pageNumber = 1;
  pageSize = 25;

  constructor(pageNumber: number, pageSize: number) {
    this.pageNumber = pageNumber;
    this.pageSize = pageSize;
  }
}
