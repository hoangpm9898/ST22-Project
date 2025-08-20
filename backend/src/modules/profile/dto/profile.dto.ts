import { IsString, IsArray, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class CreateProfileDto {
	@IsString()
	name: string;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	wallpaperIds?: string[] = [];
}

export class UpdateProfileDataDto {
	@IsOptional()
	@IsString()
	profileName?: string;

	@IsOptional()
	@IsString()
	thumbId?: string;
}

export class UpdateProfileDto {
	@Type(() => Number)
	profileId: number;

	@IsOptional()
	profileData?: UpdateProfileDataDto;

	@IsOptional()
	@IsArray()
	wallpapers?: any[];
}

export class UpdateProfileDetailDto {
	id: number;
	name: string;
	thumb?: string;
	avatar?: string;
	background?: string;
	wallpaperIds: string[];
}

export class ProfileWallpaperDto {
	id: string;
	name: string;
	url: string;
	preview_url: string;
	profileId: number;
	model_id: string;
	author_id: string;
	folder_no: string;
	tracking_type: string;
	tracking_collection_id: number;
}

export class ProfileDto {
	id: number;
	name: string;
	thumb: string;
	avatarPath?: string;
	backgroundPath?: string;
	wallpaperIds: string[];
	nsfw: {
		adult: string[];
		racy: string[];
	};
}

export class ProfileInfoDto {
	profiles: number;
	wallpapers: number;
}

export class VerifyProfileDto {
	@IsOptional()
	@IsString()
	profileId?: string;
}

export class HandleProfileResultsDto {
	@IsString()
	resource: any;

	@IsString()
	phaseNumber: string;
}
