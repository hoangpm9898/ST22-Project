import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "#root/common/dto";

export class GetAlbumsByCategoryDto extends PaginationDto {
	categoryId: number;
}

export class GetAlbumsByTagDto extends PaginationDto {
	tagId: number;
}

export class VerifyInvalidLinksDto {
	@IsOptional()
	@IsString()
	typeVerify?: string;
}

export class AppCategoryDto {
	id: number;
	name: string;
	thumb: string;
}

export class AppTagDto {
	id: number;
	name: string;
	thumb: string;
}

export class AppAlbumDto {
	id: number;
	name: string;
	categoryId: number;
	tags: string[];
	thumb_url: string;
	photos_url: string[];
	phase: number;
}

export class AppTagActiveDto {
	name: string;
	total: number;
}
