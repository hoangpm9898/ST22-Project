import { Controller, Get, Post, Body } from "@nestjs/common";
import { ManagementService } from "./management.service";
import { ListWallpapersRequestDto, ListWallpapersResponseDto, DeleteWallpaperDto, PopulateDataDto } from "./dto";

@Controller()
export class ManagementController {
	constructor(private readonly managementService: ManagementService) {}

	@Get("wallpapers/populate")
	async listPopulateData(): Promise<{ status: string; data: PopulateDataDto }> {
		const populateData = await this.managementService.getPopulateData();
		return { status: "success", data: populateData };
	}

	@Post("wallpapers")
	async listWallpapers(@Body() listWallpapersDto: ListWallpapersRequestDto): Promise<ListWallpapersResponseDto> {
		return this.managementService.listWallpapers(listWallpapersDto);
	}

	@Post("wallpapers/delete")
	async deleteWallpaper(
		@Body() deleteWallpaperDto: DeleteWallpaperDto,
	): Promise<{ status: string; message: string }> {
		await this.managementService.addToBlacklist(deleteWallpaperDto);
		return { status: "success", message: `Wallpaper ${deleteWallpaperDto.id} added to blacklist` };
	}
}
