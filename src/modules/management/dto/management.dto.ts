import { IsString, IsNumber, IsOptional, IsObject } from "class-validator";
import { Type } from "class-transformer";

export class WallpaperFilterDto {
	@IsOptional()
	@IsString()
	track_id?: string = "All";

	@IsOptional()
	@IsString()
	provider?: string = "All";

	@IsOptional()
	@IsString()
	topic?: string = "All";

	@IsOptional()
	@IsString()
	style?: string = "All";

	@IsOptional()
	@IsString()
	type?: string = "All";

	@IsOptional()
	@IsObject()
	image_size?: {
		width: string;
		height: string;
	};
}

export class ListWallpapersRequestDto {
	@Type(() => Number)
	@IsNumber()
	page: number;

	@Type(() => Number)
	@IsNumber()
	page_size: number;

	@IsObject()
	filter: WallpaperFilterDto;
}

export class WallpaperDto {
	id: string;
	image_url: string;
	model_id: string;
	author_id: string;
	folder_no: string;
	tracking_type: string;
	tracking_collection_id: number;
}

export class ListWallpapersResponseDto {
	data: WallpaperDto[];
	pagination: {
		page: number;
		page_size: number;
		total_items: number;
		total_pages: number;
		has_next: boolean;
		has_prev: boolean;
	};
}

export class DeleteWallpaperDto {
	@IsString()
	id: string;

	@IsString()
	collection_id: string;

	@IsObject()
	track_collection: {
		id: number;
		targetId: string;
		provider: string;
		type: string;
	};

	@IsOptional()
	@IsString()
	action_type?: string;
}

export class PopulateDataDto {
	track_ids: number[];
	providers: string[];
	topics: string[];
	styles: string[];
	types: string[];
}
