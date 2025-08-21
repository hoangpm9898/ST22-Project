import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { PrismaRepository } from "#root/modules/prisma/prisma.repository";
import { getRandomElement } from "#root/common/utils";
import { config } from "#root/config";
import { ApiResponseDto, PaginationResponseDto } from "#root/common/dto";
import {
	AppCategoryDto,
	AppTagDto,
	AppAlbumDto,
	AppTagActiveDto,
	GetAlbumsByCategoryDto,
	GetAlbumsByTagDto,
	HandleAlbumResultsDto,
	HandleCategoriesTagsDto,
	PushMissingWallpapersDto,
} from "./dto";
import axios from "axios";

@Injectable()
export class AppService implements OnModuleInit {
	private readonly logger: Logger = new Logger(AppService.name);
	constructor(
		private prisma: PrismaRepository,
		@InjectQueue("collection-queue") private collectionQueue: Queue,
	) {}

	async onModuleInit() {
		this.logger.log("AppService initialized with Prisma MongoDB connection");
	}

	async getAppCategories(): Promise<AppCategoryDto[]> {
		this.logger.log(`[!] Get all categories`);

		// Get all categories from the database
		const allCategories = await this.prisma.category.findMany({
			orderBy: { id: "asc" },
		});

		const categories: AppCategoryDto[] = [];

		for (const category of allCategories) {
			// Always include the "For You" category or categories that have albums
			if (category.id === config.CTG_FORYOU_ID || (await this.getAppAlbumsByCategoryID(category.id)).length > 0) {
				categories.push({
					id: category.id,
					name: category.name,
					thumb: category.thumb,
				});
			}
		}

		this.logger.log(`[!] - Get all categories success, has ${categories.length} categories`);
		return categories;
	}

	async getAppTags(): Promise<AppTagDto[]> {
		this.logger.log(`[!] Get all tags`);

		// Get all tags from the database
		const allTags = await this.prisma.tag.findMany({
			orderBy: { id: "asc" },
		});

		const tags: AppTagDto[] = [];

		for (const tag of allTags) {
			if ((await this.getAppAlbumsByTagID(tag.id)).length > 0) {
				tags.push({
					id: tag.id,
					name: tag.name,
					thumb: tag.thumb,
				});
			}
		}

		this.logger.log(`[!] - Get all tags success, has ${tags.length} tags`);
		return tags;
	}

	async getAppTagsActive(): Promise<AppTagActiveDto[]> {
		const allTags = await this.prisma.tag.findMany({
			orderBy: { id: "asc" },
		});

		const info: AppTagActiveDto[] = [];

		for (const tag of allTags) {
			const totalAlbums = (await this.getAppAlbumsByTagID(tag.id)).length;
			if (totalAlbums > 0) {
				info.push({ name: tag.name, total: totalAlbums });
			}
		}

		return info;
	}

	async getSingleAlbum(): Promise<AppAlbumDto> {
		// Get all albums and return a random one
		const albums = await this.prisma.album.findMany({
			include: { Category: true },
		});

		if (albums.length === 0) {
			throw new Error("No albums found");
		}

		const randomAlbum = getRandomElement(albums);

		// Get wallpapers for this album
		const wallpapers = await this.prisma.wallpaper.findMany({
			where: {
				id: { in: randomAlbum.wallpaperIds },
			},
			select: { preview_url: true },
		});

		return {
			id: randomAlbum.id,
			name: randomAlbum.name,
			categoryId: randomAlbum.categoryId,
			tags: randomAlbum.tags,
			thumb_url: randomAlbum.thumb,
			photos_url: wallpapers.map((w) => w.preview_url),
			phase: 1, // Default phase
		};
	}

	async getAppAlbumsByCategory(
		getAlbumsByCategoryDto: GetAlbumsByCategoryDto,
	): Promise<ApiResponseDto<AppAlbumDto[]>> {
		const { categoryId, page = 1, limit = 20 } = getAlbumsByCategoryDto;

		this.logger.log(`[!] Get list albums by category: ${categoryId}`);

		let albums: AppAlbumDto[];
		if (Number(categoryId) === Number(config.CTG_FORYOU_ID)) {
			albums = await this.getAppAlbumsByCategoryID(categoryId, true);
		} else {
			albums = await this.getAppAlbumsByCategoryID(categoryId);
		}

		this.logger.log(`[!] - Get list albums by category success, has ${albums.length} albums`);

		const totalRecords = albums.length;
		const totalPages = Math.ceil(totalRecords / limit);

		if (page > totalPages && totalRecords > 0) {
			return new ApiResponseDto({
				success: true,
				data: [],
				pagination: new PaginationResponseDto({
					hasNext: false,
					perPage: limit,
					currentPage: page,
					totalPages: totalPages,
					totalRecords: totalRecords,
				}),
			});
		}

		const startIndex = (page - 1) * limit;
		const endIndex = Math.min(startIndex + limit, totalRecords);
		const paginatedData = albums.slice(startIndex, endIndex);

		const pagination = new PaginationResponseDto({
			hasNext: page < totalPages,
			perPage: limit,
			currentPage: page,
			totalPages: totalPages,
			totalRecords: totalRecords,
		});

		return new ApiResponseDto({
			success: true,
			data: paginatedData,
			pagination: pagination,
		});
	}

	async getAppAlbumsByTag(getAlbumsByTagDto: GetAlbumsByTagDto): Promise<ApiResponseDto<AppAlbumDto[]>> {
		const { tagId, page = 1, limit = 20 } = getAlbumsByTagDto;

		this.logger.log(`[!] Get list albums by tag: ${tagId}`);

		const albums = await this.getAppAlbumsByTagID(tagId);

		this.logger.log(`[!] - Get list albums by tag success, has ${albums.length} albums`);

		const totalRecords = albums.length;
		const totalPages = Math.ceil(totalRecords / limit);

		if (page > totalPages && totalRecords > 0) {
			return new ApiResponseDto({
				success: true,
				data: [],
				pagination: new PaginationResponseDto({
					hasNext: false,
					perPage: limit,
					currentPage: page,
					totalPages: totalPages,
					totalRecords: totalRecords,
				}),
			});
		}

		const startIndex = (page - 1) * limit;
		const endIndex = Math.min(startIndex + limit, totalRecords);
		const paginatedData = albums.slice(startIndex, endIndex);

		const pagination = new PaginationResponseDto({
			hasNext: page < totalPages,
			perPage: limit,
			currentPage: page,
			totalPages: totalPages,
			totalRecords: totalRecords,
		});

		return new ApiResponseDto({
			success: true,
			data: paginatedData,
			pagination: pagination,
		});
	}

	private async getAppAlbumsByCategoryID(categoryId: number, getAllAlbums = false): Promise<AppAlbumDto[]> {
		let albums;

		if (getAllAlbums) {
			albums = await this.prisma.album.findMany({
				include: { Category: true },
				orderBy: { id: "desc" },
			});
		} else {
			albums = await this.prisma.album.findMany({
				where: { categoryId: Number(categoryId) },
				include: { Category: true },
				orderBy: { id: "desc" },
			});
		}

		// Convert to AppAlbumDto format with wallpaper URLs
		const appAlbums: AppAlbumDto[] = [];

		for (const album of albums) {
			const wallpapers = await this.prisma.wallpaper.findMany({
				where: {
					id: { in: album.wallpaperIds },
				},
				select: { preview_url: true },
			});

			appAlbums.push({
				id: album.id,
				name: album.name,
				categoryId: album.categoryId,
				tags: album.tags,
				thumb_url: album.thumb,
				photos_url: wallpapers.map((w) => w.preview_url),
				phase: 1, // Default phase
			});
		}

		return appAlbums;
	}

	private async getAppAlbumsByTagID(tagId: number): Promise<AppAlbumDto[]> {
		const tag = await this.prisma.tag.findUnique({
			where: { id: Number(tagId) },
		});

		if (!tag) return [];

		const albums = await this.prisma.album.findMany({
			where: {
				tags: {
					has: tag.name,
				},
			},
			include: { Category: true },
			orderBy: { id: "desc" },
		});

		// Convert to AppAlbumDto format with wallpaper URLs
		const appAlbums: AppAlbumDto[] = [];

		for (const album of albums) {
			const wallpapers = await this.prisma.wallpaper.findMany({
				where: {
					id: { in: album.wallpaperIds },
				},
				select: { preview_url: true },
			});

			appAlbums.push({
				id: album.id,
				name: album.name,
				categoryId: album.categoryId,
				tags: album.tags,
				thumb_url: album.thumb,
				photos_url: wallpapers.map((w) => w.preview_url),
				phase: 1, // Default phase
			});
		}

		return appAlbums;
	}

	async verifyInvalidLinks(typeVerify: string): Promise<any[]> {
		this.logger.debug("[!] Starting verification for all items...");

		let invalidLinks: any[];

		try {
			if (typeVerify === "albums") {
				// Get albums from database and convert to the expected format
				const albums = await this.prisma.album.findMany({
					include: { Category: true },
				});

				const albumsData = [];
				for (const album of albums) {
					const wallpapers = await this.prisma.wallpaper.findMany({
						where: {
							id: { in: album.wallpaperIds },
						},
						select: { preview_url: true },
					});

					albumsData.push({
						id: album.id,
						name: album.name,
						thumb_url: album.thumb,
						photos_url: wallpapers.map((w) => w.preview_url),
					});
				}

				invalidLinks = await this.checkAlbumUrls(albumsData);
			} else if (typeVerify === "tags") {
				// Get tags from database
				const tags = await this.prisma.tag.findMany();
				invalidLinks = await this.checkTagUrls(tags);
			}

			return invalidLinks || [];
		} catch (error) {
			this.logger.error("[x] Error:", error.message);
			return [];
		}
	}

	private async verifyUrl(url: string): Promise<boolean> {
		this.logger.debug(`Checking URL: ${url}`);
		try {
			await axios.head(url, { timeout: 10000 });
			return true;
		} catch (error) {
			return false;
		}
	}

	private async checkAlbumUrls(albums: any[]): Promise<any[]> {
		const invalidAlbums: any[] = [];

		for (const album of albums) {
			this.logger.debug(`[!] - Checking album ID: ${album.id} (${album.name})`);

			let hasError = false;
			const invalidAlbum = {
				id: album.id,
				name: album.name,
				thumb_error_link: null,
				photo_error_links: [],
			};

			if (album.thumb_url) {
				if (!(await this.verifyUrl(album.thumb_url))) {
					invalidAlbum.thumb_error_link = album.thumb_url;
					hasError = true;
					this.logger.debug(`[!] - Invalid thumb URL: ${album.thumb_url}`);
				}
			}

			if (album.photos_url) {
				for (const url of album.photos_url) {
					if (!(await this.verifyUrl(url))) {
						invalidAlbum.photo_error_links.push(url);
						hasError = true;
						this.logger.debug(`[!] - Invalid photo URL: ${url}`);
					}
				}
			}

			if (hasError) {
				invalidAlbums.push(invalidAlbum);
			}
		}

		this.logger.debug(`[!] Finished URL checks: ${invalidAlbums.length} invalid albums`);
		return invalidAlbums;
	}

	private async checkTagUrls(tags: any[]): Promise<any[]> {
		const invalidTags: any[] = [];

		for (const tag of tags) {
			this.logger.debug(`[!] Checking tag ID: ${tag.id} (${tag.name})`);

			let hasError = false;
			const invalidTag = {
				id: tag.id,
				name: tag.name,
				thumb_error_link: null,
			};

			if (tag.thumb) {
				if (!(await this.verifyUrl(tag.thumb))) {
					invalidTag.thumb_error_link = tag.thumb;
					hasError = true;
					this.logger.debug(`[!] - Invalid URL: ${tag.thumb}`);
				}
			}

			if (hasError) {
				invalidTags.push(invalidTag);
			}
		}

		this.logger.debug(`[!] Finished URL checks: ${invalidTags.length} invalid tags`);
		return invalidTags;
	}

	async handleAlbumsResult(handleAlbumResultsDto: HandleAlbumResultsDto): Promise<{ message: string }> {
		try {
			this.logger.log("[!] Starting album results processing...");

			// Add job to queue for background processing
			await this.collectionQueue.add("handle-albums-result", {
				resource: handleAlbumResultsDto.resource,
				phaseNumber: handleAlbumResultsDto.phaseNumber,
			});

			this.logger.log("[!] Album results job queued successfully");
			return { message: "Albums has generating..." };
		} catch (error) {
			this.logger.error(`[x] Error queuing album results job: ${error.message}`);
			throw new Error(`Failed to queue album results processing: ${error.message}`);
		}
	}

	async handleProfilesResult(handleProfileResultsDto: any): Promise<{ message: string }> {
		try {
			this.logger.log("[!] Starting profile results processing...");

			// Add job to queue for background processing
			await this.collectionQueue.add("handle-profiles-result", {
				resource: handleProfileResultsDto.resource,
				phaseNumber: handleProfileResultsDto.phaseNumber,
			});

			this.logger.log("[!] Profile results job queued successfully");
			return { message: "Profiles has generating..." };
		} catch (error) {
			this.logger.error(`[x] Error queuing profile results job: ${error.message}`);
			throw new Error(`Failed to queue profile results processing: ${error.message}`);
		}
	}

	async handleCategoriesAndTagsResult(
		handleCategoriesTagsDto: HandleCategoriesTagsDto,
	): Promise<{ message: string }> {
		try {
			this.logger.log("[!] Starting categories and tags results processing...");

			// Add job to queue for background processing
			await this.collectionQueue.add("handle-categories-tags-result", {
				resource: handleCategoriesTagsDto.resource,
			});

			this.logger.log("[!] Categories and tags results job queued successfully");
			return { message: "Categories & Tags has generating..." };
		} catch (error) {
			this.logger.error(`[x] Error queuing categories and tags results job: ${error.message}`);
			throw new Error(`Failed to queue categories and tags results processing: ${error.message}`);
		}
	}

	async pushMissingWallpapers(pushMissingDto: PushMissingWallpapersDto): Promise<{ message: string }> {
		try {
			this.logger.log(`[!] Starting push missing wallpapers for album: ${pushMissingDto.albumId}`);

			// Add job to queue for background processing
			await this.collectionQueue.add("push-missing-wallpapers", {
				resource: pushMissingDto.resource,
				albumId: pushMissingDto.albumId,
				wallpaperIds: pushMissingDto.wallpaperIds,
			});

			this.logger.log("[!] Push missing wallpapers job queued successfully");
			return { message: "Push missing wallpapers sucessfully!" };
		} catch (error) {
			this.logger.error(`[x] Error queuing push missing wallpapers job: ${error.message}`);
			throw new Error(`Failed to queue push missing wallpapers processing: ${error.message}`);
		}
	}
}
