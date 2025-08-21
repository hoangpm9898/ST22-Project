import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaRepository } from "#root/modules/prisma/prisma.repository";
import {
	ListWallpapersRequestDto,
	ListWallpapersResponseDto,
	WallpaperDto,
	DeleteWallpaperDto,
	PopulateDataDto,
	WallpaperFilterDto,
} from "./dto";
import { config } from "#root/config";

@Injectable()
export class ManagementService implements OnModuleInit {
	private readonly logger: Logger = new Logger(ManagementService.name);
	private blacklistSet = new Set<string>();

	constructor(private prisma: PrismaRepository) {}

	async onModuleInit() {
		await this.loadBlacklist();
		this.logger.log("ManagementService initialized with Prisma MongoDB connection");
	}

	private async loadBlacklist(): Promise<void> {
		// Load all wallpapers that are currently in use (albums and profiles)
		try {
			const wallpapers = await this.prisma.wallpaper.findMany({
				select: { id: true },
			});

			wallpapers.forEach((w) => this.blacklistSet.add(w.id));
			this.logger.log(`*** Loaded ${this.blacklistSet.size} wallpapers in blacklist`);
		} catch (error) {
			this.logger.error("Error loading wallpapers for blacklist:", error);
		}
	}

	async updateTrackingCollections(): Promise<void> {
		// This method is called after queue processing to refresh tracking collections
		this.logger.log("[!] Updated tracking collections successfully.");
	}

	async getPopulateData(): Promise<PopulateDataDto> {
		const trackingCollections = await this.prisma.trackingCollection.findMany({
			where: {
				collectionStatus: "tracked",
			},
			select: {
				collectionId: true,
				collectionProvider: true,
				collectionTopic: true,
				collectionStyle: true,
				collectionType: true,
			},
		});

		const track_ids: number[] = [];
		const providers: string[] = [];
		const topics: string[] = [];
		const styles: string[] = [];
		const types: string[] = [];

		trackingCollections.forEach((t) => {
			if (!track_ids.includes(t.collectionId)) track_ids.push(t.collectionId);
			if (!providers.includes(t.collectionProvider)) providers.push(t.collectionProvider);
			if (!topics.includes(t.collectionTopic)) topics.push(t.collectionTopic);
			if (!styles.includes(t.collectionStyle)) styles.push(t.collectionStyle);
			if (!types.includes(t.collectionType)) types.push(t.collectionType);
		});

		return { track_ids, providers, topics, styles, types };
	}

	async getWallpapers(filter: WallpaperFilterDto): Promise<WallpaperDto[]> {
		try {
			const {
				provider = "All",
				topic = "All",
				style = "All",
				type = "All",
				track_id = "All",
				image_size,
			} = filter;

			this.logger.log(`[!] List <${provider}> wallpapers starting...`);

			// Build filter for tracking collections
			const collectionFilter: any = {
				collectionStatus: "tracked",
			};

			if (provider !== "All") {
				collectionFilter.collectionProvider = provider;
			}
			if (topic !== "All") {
				this.logger.log(`[!] - List <${provider}> wallpapers with topic: ${topic}`);
				collectionFilter.collectionTopic = topic;
			}
			if (style !== "All") {
				this.logger.log(`[!] - List <${provider}> wallpapers with style: ${style}`);
				collectionFilter.collectionStyle = style;
			}
			if (type !== "All") {
				this.logger.log(`[!] - List <${provider}> wallpapers with type: ${type}`);
				collectionFilter.collectionType = type;
			}
			if (track_id !== "All") {
				this.logger.log(`[!] - List <${provider}> wallpapers with track_id: ${track_id}`);
				collectionFilter.collectionId = Number(track_id);
			}

			// Get filtered tracking collections
			const filteredCollections = await this.prisma.trackingCollection.findMany({
				where: collectionFilter,
				orderBy: { collectionId: "desc" },
			});

			this.logger.log(`[!] - Found ${filteredCollections.length} matching tracking collections`);

			let wallpapers: WallpaperDto[] = [];

			for (const collection of filteredCollections) {
				this.logger.log(`[!] - List wallpapers for track-collection '${collection.collectionId}'`);

				try {
					let seaArtWorks: any[] = [];

					// Build filter for SeaArt works
					const workFilter: any = {
						status: true,
						trackingCollectionId: collection.collectionId,
					};

					// Add image size filter if provided
					if (image_size) {
						workFilter.banner = {
							path: ["width"],
							gte: parseInt(image_size.width),
						};
					}

					// Handling for collections type...
					if (collection.collectionType === "User_Collection" || collection.collectionType === "All") {
						seaArtWorks = [
							...seaArtWorks,
							...(await this.prisma.seaArtWork.findMany({
								where: {
									...workFilter,
									trackingType: "collection",
									authorId: collection.collectionTargetId,
								},
							})),
						];
					}

					// Handling for works type...
					if (collection.collectionType === "User_Work" || collection.collectionType === "All") {
						seaArtWorks = [
							...seaArtWorks,
							...(await this.prisma.seaArtWork.findMany({
								where: {
									...workFilter,
									trackingType: "work",
									authorId: collection.collectionTargetId,
								},
							})),
						];
					}

					// Convert SeaArt works to wallpaper DTOs
					const items: WallpaperDto[] = seaArtWorks
						.filter((work) => {
							// Apply image size filter if provided
							if (image_size && work.banner) {
								return this.checkImageSize(work.banner.width || 0, work.banner.height || 0, image_size);
							}
							return true;
						})
						.map((work) => ({
							id: work.id,
							image_url: work.banner?.url || "",
							model_id: work.modelId,
							author_id: work.authorId,
							folder_no: work.folderNo,
							tracking_type: work.trackingType,
							tracking_collection_id: work.trackingCollectionId,
						}));

					this.logger.log(
						`[!] - List wallpapers for track-collection '${collection.collectionId}' success: ${items.length} items`,
					);

					wallpapers = [...wallpapers, ...items];
				} catch (error) {
					this.logger.error(
						`[x] - List wallpapers for track-collection '${collection.collectionId}' fail: ${error.message}`,
					);
				}
			}

			// Filter out blacklisted wallpapers
			await this.loadBlacklist();
			wallpapers = wallpapers.filter((w) => !this.blacklistSet.has(w.id));

			this.logger.log(`[!] - List wallpapers successfully: ${wallpapers.length} wallpapers`);
			return wallpapers;
		} catch (error) {
			this.logger.error(`[x] - List wallpapers error: ${error.message}`);
			return [];
		}
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

		this.logger.log(`[!] Remove wallpaper has id: ${id}`);

		try {
			// Update the SeaArt work status to mark it as unavailable
			if (track_collection.type === "collection") {
				await this.prisma.seaArtWork.updateMany({
					where: {
						id: id,
						folderNo: collection_id,
						authorId: track_collection.targetId,
					},
					data: {
						status: false,
					},
				});
			} else if (track_collection.type === "work") {
				await this.prisma.seaArtWork.updateMany({
					where: {
						id: id,
						authorId: track_collection.targetId,
					},
					data: {
						status: false,
					},
				});
			}

			// Add to blacklist cache
			this.blacklistSet.add(id);

			this.logger.log(`[!] - Remove wallpaper has id ${id} successfully.`);
		} catch (error) {
			this.logger.error(`[x] - Remove wallpaper has id ${id} failed: ${error.message}`);
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
