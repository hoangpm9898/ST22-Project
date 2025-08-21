import { Controller, Get, Post, Delete, Param, Body, Query, ParseIntPipe } from "@nestjs/common";
import { AlbumService } from "./album.service";
import { CreateAlbumDto, UpdateAlbumDto, VerifyAlbumDto } from "./dto";

@Controller()
export class AlbumController {
	constructor(private readonly albumService: AlbumService) {}

	// Album routes
	@Get("albums")
	async listAlbums() {
		return this.albumService.listAlbums();
	}

	@Get("albums/:albumId")
	async getAlbum(@Param("albumId", ParseIntPipe) albumId: number) {
		return this.albumService.getAlbum(albumId);
	}

	@Get("albums/:albumId/images")
	async getImages(@Param("albumId", ParseIntPipe) albumId: number, @Query("full") full?: string) {
		const getFullFields = full === "true";
		return this.albumService.getImagesByAlbumId(albumId, getFullFields, false);
	}

	@Post("albums")
	async createAlbum(@Body() createAlbumDto: CreateAlbumDto) {
		return this.albumService.createAlbum(createAlbumDto);
	}

	@Post("albums/:typeHandler")
	async updateAlbum(@Param("typeHandler") typeHandler: string, @Body() updateAlbumDto: UpdateAlbumDto) {
		return this.albumService.updateAlbum(typeHandler, updateAlbumDto);
	}

	@Delete("albums/:albumId")
	async deleteAlbum(@Param("albumId", ParseIntPipe) albumId: number) {
		await this.albumService.deleteAlbum(albumId);
		return { message: "Album deleted successfully" };
	}

	// Album routes (more)
	@Get("album/tags")
	async getTags() {
		return this.albumService.getTags();
	}

	@Get("album/categories")
	async getCategories() {
		return this.albumService.getCategories();
	}

	@Get("album/info")
	async getAlbumsInfo() {
		return this.albumService.getAlbumsInfo();
	}

	@Get("album/verify")
	async verifyAlbum(@Query() verifyAlbumDto: VerifyAlbumDto) {
		const albumId = parseInt(verifyAlbumDto.albumId);
		return this.albumService.verifyAlbum(albumId, "NSFW");
	}
}
