import type { BetterFetch } from "@better-fetch/fetch";

export interface Opts {
	$fetch?: BetterFetch;
	headers?: HeadersInit;
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

export type PaginatedResponse<T> = {
	data: T[];
	meta: {
		totalRowCount: number;
		totalFilteredRowCount: number;
		currentPage: number;
		nextPage: number | null;
		prevPage: number | null;
	};
};
