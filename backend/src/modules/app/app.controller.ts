import { Controller, Get, Param, Query, ParseIntPipe, VERSION_NEUTRAL } from "@nestjs/common";
import { AppService } from "./app.service";
import {
	AppCategoryDto,
	AppTagDto,
	AppAlbumDto,
	AppTagActiveDto,
	GetAlbumsByCategoryDto,
	GetAlbumsByTagDto,
	VerifyInvalidLinksDto,
} from "./dto";
import { ApiResponseDto } from "#root/common/dto";

@Controller({
	version: VERSION_NEUTRAL,
})
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Get()
	health() {
		return { status: "ok" };
	}

	// App Backend: Album Data endpoints
	@Get("categories")
	async getAppCategories(): Promise<AppCategoryDto[]> {
		return this.appService.getAppCategories();
	}

	@Get("hashtags")
	async getAppTags(): Promise<AppTagDto[]> {
		return this.appService.getAppTags();
	}

	@Get("hashtags-active")
	async getAppTagsActive(): Promise<AppTagActiveDto[]> {
		return this.appService.getAppTagsActive();
	}

	@Get("album")
	async getSingleAlbum(): Promise<AppAlbumDto> {
		return this.appService.getSingleAlbum();
	}

	@Get("categories/:categoryId/albums")
	async listAlbumsByCategory(
		@Param("categoryId", ParseIntPipe) categoryId: number,
		@Query("page") page?: number,
		@Query("limit") limit?: number,
	): Promise<ApiResponseDto<AppAlbumDto[]>> {
		const getAlbumsByCategoryDto: GetAlbumsByCategoryDto = {
			categoryId,
			page: page || 1,
			limit: limit || 20,
		};
		return this.appService.getAppAlbumsByCategory(getAlbumsByCategoryDto);
	}

	@Get("hashtags/:tagId/albums")
	async listAlbumsByTag(
		@Param("tagId", ParseIntPipe) tagId: number,
		@Query("page") page?: number,
		@Query("limit") limit?: number,
	): Promise<ApiResponseDto<AppAlbumDto[]>> {
		const getAlbumsByTagDto: GetAlbumsByTagDto = {
			tagId,
			page: page || 1,
			limit: limit || 20,
		};
		return this.appService.getAppAlbumsByTag(getAlbumsByTagDto);
	}

	@Get("verify/invalid-links")
	async verifyInvalidLinks(@Query() verifyInvalidLinksDto: VerifyInvalidLinksDto): Promise<any[]> {
		return this.appService.verifyInvalidLinks(verifyInvalidLinksDto.typeVerify || "albums");
	}
}
