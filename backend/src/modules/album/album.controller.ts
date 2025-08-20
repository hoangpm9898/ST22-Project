import { Controller, Get, Post, Delete, Param, Body, Query, ParseIntPipe } from "@nestjs/common";
import { AlbumService } from "./album.service";
import {
	CreateAlbumDto,
	UpdateAlbumDto,
	VerifyAlbumDto,
	HandleAlbumResultsDto,
	HandleCategoriesTagsDto,
	PushMissingWallpapersDto,
} from "./dto";

@Controller("albums")
export class AlbumController {
	constructor(private readonly albumService: AlbumService) {}

	@Get("categories")
	async getCategories() {
		return this.albumService.getCategories();
	}

	@Get("tags")
	async getTags() {
		return this.albumService.getTags();
	}

	@Get("info")
	async getAlbumsInfo() {
		return this.albumService.getAlbumsInfo();
	}

	@Get(":albumId")
	async getAlbum(@Param("albumId", ParseIntPipe) albumId: number) {
		return this.albumService.getAlbum(albumId);
	}

	@Get(":albumId/images")
	async getImages(@Param("albumId", ParseIntPipe) albumId: number, @Query("full") full?: string) {
		const getFullFields = full === "true";
		return this.albumService.getImagesByAlbumId(albumId, getFullFields, false);
	}

	@Get()
	async listAlbums() {
		return this.albumService.listAlbums();
	}

	@Post()
	async createAlbum(@Body() createAlbumDto: CreateAlbumDto) {
		return this.albumService.createAlbum(createAlbumDto);
	}

	@Post(":typeHandler")
	async updateAlbum(@Param("typeHandler") typeHandler: string, @Body() updateAlbumDto: UpdateAlbumDto) {
		// Implementation will be added in the next update
		return { message: "Update album endpoint - to be implemented" };
	}

	@Delete(":albumId")
	async deleteAlbum(@Param("albumId", ParseIntPipe) albumId: number) {
		await this.albumService.deleteAlbum(albumId);
		return { message: "Album deleted successfully" };
	}

	@Get("verify")
	async verifyAlbum(@Query() verifyAlbumDto: VerifyAlbumDto) {
		const albumId = parseInt(verifyAlbumDto.albumId);
		return this.albumService.verifyAlbum(albumId, "NSFW");
	}

	// Background processing endpoints
	@Post("results")
	async handleAlbumsResult(@Body() handleAlbumResultsDto: HandleAlbumResultsDto) {
		// Implementation will be added when we create the queue service
		return { message: "Albums has generating..." };
	}

	@Post("categories-tags-result")
	async handleCategoriesAndTagsResult(@Body() handleCategoriesTagsDto: HandleCategoriesTagsDto) {
		// Implementation will be added when we create the queue service
		return { message: "Categories & Tags has generating..." };
	}

	@Post("push-missing")
	async pushMissingWallpapers(@Body() pushMissingDto: PushMissingWallpapersDto) {
		// Implementation will be added when we create the queue service
		return { message: "Push missing wallpapers successfully!" };
	}
}
