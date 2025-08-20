import { IsString, IsNumber, IsArray, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class CreateAlbumDto {
	@IsString()
	albumName: string;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	wallpaperIds?: string[] = [];
}

export class UpdateAlbumDataDto {
	@IsOptional()
	@IsString()
	albumName?: string;

	@IsOptional()
	@IsString()
	albumCategory?: string;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	albumTags?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	albumCountries?: string[];

	@IsOptional()
	@IsString()
	thumbId?: string;
}

export class UpdateAlbumDto {
	@IsNumber()
	@Type(() => Number)
	albumId: number;

	@IsOptional()
	albumData?: UpdateAlbumDataDto;

	@IsOptional()
	@IsArray()
	wallpapers?: any[];
}

export class AlbumWallpaperDto {
	id: string;
	name: string;
	url: string;
	preview_url: string;
	albumId: number;
	model_id: string;
	author_id: string;
	folder_no: string;
	tracking_type: string;
	tracking_collection_id: number;
}

export class AlbumDto {
	id: number;
	name: string;
	thumb: string;
	categoryId: number;
	tags: string[];
	countries: string[];
	wallpaperIds: string[];
	nsfw: {
		adult: string[];
		racy: string[];
	};
	mapStatus: boolean;
}

export class CategoryDto {
	id: number;
	name: string;
	thumb: string;
}

export class TagDto {
	id: number;
	name: string;
	thumb: string;
}

export class CountryDto {
	id: number;
	name: string;
}

export class AlbumInfoDto {
	albums: number;
	wallpapers: number;
	categories: number;
	tags: number;
}

export class VerifyAlbumDto {
	@IsOptional()
	@IsString()
	albumId?: string;
}

export class HandleAlbumResultsDto {
	@IsString()
	resource: any;

	@IsString()
	phaseNumber: string;
}

export class HandleCategoriesTagsDto {
	@IsString()
	resource: any;
}

export class PushMissingWallpapersDto {
	@IsString()
	resource: any;

	@IsString()
	albumId: string;

	@IsArray()
	@IsString({ each: true })
	wallpaperIds: string[];
}
