export interface PagedResult<T> {

    totalPages: number
    results: T[]
}

export class PagingOptions {
    pageNumber: number = 1;
    pageSize: number = 25;

    constructor(pageNumber: number, pageSize: number) {
        this.pageNumber = pageNumber;
        this.pageSize = pageSize
    }

    toString(prependQuestion: boolean = false): string {
        let q: string = prependQuestion ? "?" : "";
        return q + "PageNumber=" + this.pageNumber.toString() + "&PageSize=" + this.pageSize.toString();
    };
}
