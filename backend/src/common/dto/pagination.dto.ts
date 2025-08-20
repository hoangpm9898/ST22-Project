import { IsNumber, IsOptional, Min } from "class-validator";
import { Type } from "class-transformer";

export class PaginationDto {
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(1)
	page?: number = 1;

	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(1)
	limit?: number = 20;
}

export class PaginationResponseDto {
	has_next: boolean;
	per_page: number;
	current_page: number;
	total_pages: number;
	total_records: number;

	constructor(params: {
		hasNext: boolean;
		perPage: number;
		currentPage: number;
		totalPages: number;
		totalRecords: number;
	}) {
		this.has_next = params.hasNext;
		this.per_page = params.perPage;
		this.current_page = params.currentPage;
		this.total_pages = params.totalPages;
		this.total_records = params.totalRecords;
	}
}

export class ApiResponseDto<T> {
	success: boolean;
	data: T;
	pagination?: PaginationResponseDto;

	constructor(params: { success: boolean; data: T; pagination?: PaginationResponseDto }) {
		this.success = params.success;
		this.data = params.data;
		this.pagination = params.pagination;
	}
}
