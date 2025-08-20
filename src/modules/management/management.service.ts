import { Injectable, OnModuleInit } from "@nestjs/common";
import { readJSONFile, readDirectory, ensureJSONFileAndWrite } from "#root/common/utils";
import { config } from "#root/config";
import {
	ListWallpapersRequestDto,
	ListWallpapersResponseDto,
	WallpaperDto,
	DeleteWallpaperDto,
	PopulateDataDto,
	WallpaperFilterDto,
} from "./dto";

interface TrackingCollection {
	collectionId: number;
	collectionStatus: string;
	collectionProvider: string;
	collectionTopic: string;
	collectionStyle: string;
	collectionType: string;
	collectionTargetId: string;
}

@Injectable()
export class ManagementService implements OnModuleInit {
	private blacklistSet = new Set<string>();
	private trackingCollections: TrackingCollection[] = [];

	async onModuleInit() {
		await this.loadBlacklist();
		await this.updateTrackingCollections();
	}

	private async loadBlacklist(): Promise<void> {
		// Load album wallpapers into blacklist
		try {
			const albumWallpapers = await readJSONFile(config.WALLPAPERS_PATH);
			albumWallpapers.forEach((w: any) => this.blacklistSet.add(w.id));
		} catch (error) {
			console.error("Error loading album wallpapers for blacklist:", error);
		}

		// Load profile wallpapers into blacklist
		try {
			const profileWallpapers = await readJSONFile(config.PROFILES_WALLPAPERS_PATH);
			profileWallpapers.forEach((w: any) => this.blacklistSet.add(w.id));
		} catch (error) {
			console.error("Error loading profile wallpapers for blacklist:", error);
		}

		console.log(`*** Loaded ${this.blacklistSet.size} wallpapers in blacklist`);
	}

	async updateTrackingCollections(): Promise<void> {
		this.trackingCollections = await readJSONFile(config.FILE_PATH_LIST_TRACKING_COLL);
		console.log("\n[!] Updated tracking collections successfully.");
	}

	async getPopulateData(): Promise<PopulateDataDto> {
		const track_ids: number[] = [];
		const providers: string[] = [];
		const topics: string[] = [];
		const styles: string[] = [];
		const types: string[] = [];

		this.trackingCollections
			.filter((c) => c.collectionStatus === "tracked")
			.forEach((t) => {
				if (!track_ids.includes(t.collectionId)) track_ids.push(t.collectionId);
				if (!providers.includes(t.collectionProvider)) providers.push(t.collectionProvider);
				if (!topics.includes(t.collectionTopic)) topics.push(t.collectionTopic);
				if (!styles.includes(t.collectionStyle)) styles.push(t.collectionStyle);
				if (!types.includes(t.collectionType)) types.push(t.collectionType);
			});

		return { track_ids, providers, topics, styles, types };
	}

	async getWallpapers(filter: WallpaperFilterDto): Promise<WallpaperDto[]> {
		let wallpapers: WallpaperDto[] = [];

		try {
			const {
				provider = "All",
				topic = "All",
				style = "All",
				type = "All",
				track_id = "All",
				image_size,
			} = filter;

			console.log(`\n[!] List <${provider}> wallpapers starting...`);

			let filteredCollections = this.trackingCollections;

			if (provider !== "All") {
				filteredCollections = filteredCollections.filter((c) => c.collectionProvider === provider);
			}
			if (topic !== "All") {
				console.log(`[!] - List <${provider}> wallpapers with topic: ${topic}`);
				filteredCollections = filteredCollections.filter((c) => c.collectionTopic === topic);
			}
			if (style !== "All") {
				console.log(`[!] - List <${provider}> wallpapers with style: ${style}`);
				filteredCollections = filteredCollections.filter((c) => c.collectionStyle === style);
			}
			if (type !== "All") {
				console.log(`[!] - List <${provider}> wallpapers with type: ${type}`);
				filteredCollections = filteredCollections.filter((c) => c.collectionType === type);
			}
			if (track_id !== "All") {
				console.log(`[!] - List <${provider}> wallpapers with track_id: ${track_id} (${typeof track_id})`);
				filteredCollections = filteredCollections.filter((c) => c.collectionId === Number(track_id));
			}

			// Sort filteredCollections by created_at (or collectionId)
			if (filteredCollections.length > 1) {
				filteredCollections = filteredCollections.sort((a, b) => b.collectionId - a.collectionId);
			}

			for (const collection of filteredCollections) {
				if (collection.collectionStatus !== "tracked") continue;

				console.log(`[!] - List wallpapers for track-collection '${collection.collectionId}'`);

				let items: any[] = [];
				try {
					// Handling for collections type...
					if (collection.collectionType === "User_Collection" || collection.collectionType === "All") {
						const dirPath = `data/collections/${collection.collectionProvider}/collections/${collection.collectionTargetId}`;
						const files = await readDirectory(dirPath);
						console.log(
							`[!] - List wallpapers for track-collection '${collection.collectionId}' by collection type, has: ${files.length} collections`,
						);

						for (const file of files) {
							const itemsByCollections = await readJSONFile(`${dirPath}/${file}`);
							console.log(
								`[!] - List wallpapers for track-collection '${collection.collectionId}' by collection type, has: ${itemsByCollections.length} items`,
							);

							// Filter with blacklist & image size...
							if (itemsByCollections && itemsByCollections.length > 0) {
								items = [
									...items,
									...itemsByCollections
										.filter(
											(i: any) =>
												i.status &&
												this.checkImageSize(i.banner.width, i.banner.height, image_size),
										)
										.map((i: any) => ({
											id: i.id,
											image_url: i.banner.url,
											model_id: i.model_id,
											author_id: i.author_id,
											folder_no: i.folder_no,
											tracking_type: i.tracking_type,
											tracking_collection_id: i.tracking_collection_id,
										})),
								];
							}
						}
					}

					// Handling for works type...
					if (collection.collectionType === "User_Work" || collection.collectionType === "All") {
						const filePath = `data/collections/${collection.collectionProvider}/works/${collection.collectionTargetId}.json`;
						const itemsByWork = await readJSONFile(filePath);
						console.log(
							`[!] - List wallpapers for track-collection '${collection.collectionId}' by Work type, has: ${itemsByWork.length} items`,
						);

						// Filter with blacklist...
						if (itemsByWork && itemsByWork.length > 0) {
							items = [
								...items,
								...itemsByWork
									.filter(
										(i: any) =>
											i.status &&
											this.checkImageSize(i.banner.width, i.banner.height, image_size),
									)
									.map((i: any) => ({
										id: i.id,
										image_url: i.banner.url,
										model_id: i.model_id,
										author_id: i.author_id,
										folder_no: i.folder_no,
										tracking_type: i.tracking_type,
										tracking_collection_id: i.tracking_collection_id,
									})),
							];
						}
					}

					console.log(
						`[!] - List wallpapers for track-collection '${collection.collectionId}' success: ${items.length} items`,
					);

					wallpapers = [...wallpapers, ...items];

					// Filter existed wallpapers
					await this.loadBlacklist();
					wallpapers = wallpapers.filter((w) => !this.blacklistSet.has(w.id));
				} catch (error) {
					console.error(
						`[x] - List wallpapers for track-collection '${collection.collectionId}' fail: ${error.message}`,
					);
				}
			}

			console.log(`[!] - List wallpapers successfully: ${wallpapers.length} wallpapers`);
		} catch (error) {
			console.error(`[x] - List wallpapers error: ${error.message}`);
		}

		return wallpapers;
	}

	async listWallpapers(listWallpapersDto: ListWallpapersRequestDto): Promise<ListWallpapersResponseDto> {
		const { page, page_size, filter } = listWallpapersDto;

		const pageNum = parseInt(page.toString(), 10);
		const pageSizeNum = parseInt(page_size.toString(), 10);

		// Get list of wallpapers...
		const wallpapers = await this.getWallpapers(filter);

		const totalItems = wallpapers.length;
		const totalPages = Math.ceil(totalItems / pageSizeNum);
		const startIndex = (pageNum - 1) * pageSizeNum;
		const endIndex = startIndex + pageSizeNum;
		const paginatedCollections = wallpapers.slice(startIndex, endIndex);

		return {
			data: paginatedCollections,
			pagination: {
				page: pageNum,
				page_size: pageSizeNum,
				total_items: totalItems,
				total_pages: totalPages,
				has_next: pageNum < totalPages,
				has_prev: pageNum > 1,
			},
		};
	}

	async addToBlacklist(deleteWallpaperDto: DeleteWallpaperDto): Promise<void> {
		const { id, collection_id, track_collection } = deleteWallpaperDto;

		console.log(`\n[!] Remove wallpaper has id: ${id}`);

		try {
			let filePath: string;

			// For wallpaper has type: Collection
			if (track_collection.type === "collection") {
				filePath = `data/collections/${track_collection.provider}/collections/${track_collection.targetId}/${collection_id}.json`;
			}
			// For wallpaper has type: Work
			else if (track_collection.type === "work") {
				filePath = `data/collections/${track_collection.provider}/works/${track_collection.targetId}.json`;
			}

			const wallpapers = await readJSONFile(filePath);

			const wallpapersUpdated = wallpapers.map((w: any) => {
				if (w.id === id) {
					return { ...w, status: false };
				} else {
					return w;
				}
			});
			await ensureJSONFileAndWrite(filePath, wallpapersUpdated);

			console.log(`[!] - Remove wallpaper has id ${id} successfully.`);
		} catch (error) {
			console.error(`[x] - Remove wallpaper has id ${id} failed: ${error.message}`);
		}
	}

	private checkImageSize(width: number, height: number, image_size?: { width: string; height: string }): boolean {
		if (!image_size) return true;

		const sizeValid = width + height >= parseInt(image_size.width) + parseInt(image_size.height);

		if (config.FILTER_BY_IMAGE_ASPECT_RATIO === "ENABLE") {
			// Support for 9:16 and 3:4
			const aspectRatio = width / height;
			return sizeValid && (aspectRatio === 0.5625 || aspectRatio === 0.75);
		}

		return sizeValid;
	}
}
