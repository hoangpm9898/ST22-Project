import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaRepository } from "#root/modules/prisma/prisma.repository";
import { AlbumDto, AlbumInfoDto, CategoryDto, CreateAlbumDto, TagDto, UpdateAlbumDto } from "./dto";
import { NsfwVerificationService } from "#root/modules/nsfw/nsfw-verification.service";

@Injectable()
export class AlbumService implements OnModuleInit {
	private readonly logger: Logger = new Logger(AlbumService.name);

	constructor(
		private prisma: PrismaRepository,
		private nsfwService: NsfwVerificationService,
	) {}

	async onModuleInit() {
		this.logger.log("AlbumService initialized with Prisma MongoDB connection");
	}

	// Public methods
	async getCategories(): Promise<CategoryDto[]> {
		this.logger.log(`[!] Get all categories`);

		const categories = await this.prisma.category.findMany({
			orderBy: { id: "asc" },
		});

		this.logger.log(`[!] - Get all categories success, has ${categories.length} categories`);
		return categories;
	}

	async getTags(): Promise<TagDto[]> {
		this.logger.log(`[!] Get all tags`);

		const tags = await this.prisma.tag.findMany({
			orderBy: { id: "asc" },
		});

		this.logger.log(`[!] - Get all tags success, has ${tags.length} tags`);
		return tags;
	}

	async getAlbumsInfo(): Promise<AlbumInfoDto> {
		this.logger.log(`[!] Get albums info...`);

		const [totalAlbums, totalWallpapers, totalCategories, totalTags] = await Promise.all([
			this.prisma.album.count(),
			this.prisma.wallpaper.count(),
			this.prisma.category.count(),
			this.prisma.tag.count(),
		]);

		this.logger.log(
			`[!] - Get albums info success: ${totalAlbums} albums, ${totalWallpapers} wallpapers, ${totalCategories} categories, ${totalTags} tags`,
		);

		return {
			albums: totalAlbums,
			wallpapers: totalWallpapers,
			categories: totalCategories,
			tags: totalTags,
		};
	}

	async getAlbum(albumId: number): Promise<AlbumDto> {
		this.logger.log(`[!] Get album: ${albumId}`);

		const album = await this.prisma.album.findUnique({
			where: { id: albumId },
			include: { Category: true },
		});

		if (!album) {
			throw new Error(`Album not found: ${albumId}`);
		}

		const albumDto: AlbumDto = {
			id: album.id,
			name: album.name,
			thumb: album.thumb,
			categoryId: album.categoryId,
			tags: album.tags,
			countries: album.countries,
			wallpaperIds: album.wallpaperIds,
			nsfw: {
				adult: album.nsfwAdult,
				racy: album.nsfwRacy,
			},
			mapStatus: album.mapStatus,
		};

		this.logger.log(`[!] - Get album success, has name: ${album.name}`);
		return albumDto;
	}

	async getImagesByAlbumId(albumId: number, getFullFields?: boolean, getHighQualityUrl?: boolean): Promise<any[]> {
		this.logger.log(`[!] Get images of album: ${albumId}`);

		const album = await this.prisma.album.findUnique({
			where: { id: albumId },
		});

		if (!album) {
			throw new Error(`Album not found: ${albumId}`);
		}

		const wallpapers = await this.prisma.wallpaper.findMany({
			where: {
				id: { in: album.wallpaperIds },
			},
		});

		let wallpaperUrls: any[];

		if (getFullFields) {
			wallpaperUrls = wallpapers.map((w) => ({
				id: w.id,
				name: w.name,
				url: w.url,
				preview_url: w.preview_url,
				albumId: w.albumId,
				model_id: w.modelId,
				author_id: w.authorId,
				folder_no: w.folderNo,
				tracking_type: w.trackingType,
				tracking_collection_id: w.trackingCollectionId,
			}));
		} else {
			wallpaperUrls = wallpapers.map((wallpaper) => (getHighQualityUrl ? wallpaper.url : wallpaper.preview_url));
		}

		this.logger.log(`[!] - Get images of album success, has ${wallpaperUrls.length} images`);
		return wallpaperUrls;
	}

	async listAlbums(): Promise<AlbumDto[]> {
		this.logger.log(`[!] List all albums`);

		const albums = await this.prisma.album.findMany({
			include: { Category: true },
			orderBy: { id: "desc" },
		});

		const albumDtos: AlbumDto[] = albums.map((album) => ({
			id: album.id,
			name: album.name,
			thumb: album.thumb,
			categoryId: album.categoryId,
			tags: album.tags,
			countries: album.countries,
			wallpaperIds: album.wallpaperIds,
			nsfw: {
				adult: album.nsfwAdult,
				racy: album.nsfwRacy,
			},
			mapStatus: album.mapStatus,
		}));

		this.logger.log(`[!] - List all albums success, has ${albums.length} albums`);
		return albumDtos;
	}

	async createAlbum(createAlbumDto: CreateAlbumDto): Promise<AlbumDto> {
		const albumId = Date.now();
		this.logger.log(`[!] Create a new album: ${albumId}`);

		const newAlbum = await this.prisma.album.create({
			data: {
				id: albumId,
				name: createAlbumDto.albumName,
				categoryId: 0,
				thumb: "",
				tags: [],
				countries: [],
				wallpaperIds: createAlbumDto.wallpaperIds || [],
				nsfwAdult: [],
				nsfwRacy: [],
				mapStatus: false,
			},
		});

		const albumDto: AlbumDto = {
			id: newAlbum.id,
			name: newAlbum.name,
			thumb: newAlbum.thumb,
			categoryId: newAlbum.categoryId,
			tags: newAlbum.tags,
			countries: newAlbum.countries,
			wallpaperIds: newAlbum.wallpaperIds,
			nsfw: {
				adult: newAlbum.nsfwAdult,
				racy: newAlbum.nsfwRacy,
			},
			mapStatus: newAlbum.mapStatus,
		};

		this.logger.log(`[!] - Create new album success`);
		return albumDto;
	}

	async updateAlbum(typeHandler: string, updateAlbumDto: UpdateAlbumDto): Promise<any> {
		let error = false;
		let message: string;

		try {
			this.logger.log(`[!] ${typeHandler.toUpperCase()} wallpapers for album: ${updateAlbumDto.albumId}`);

			const album = await this.prisma.album.findUnique({
				where: { id: updateAlbumDto.albumId },
			});

			if (!album) {
				throw new Error(`Album not found: ${updateAlbumDto.albumId}`);
			}

			if (typeHandler.toUpperCase() === "ADD") {
				// Add new wallpapers logic
				let wallpaperSuccessCount = 0;
				let wallpaperExistedCount = 0;
				let wallpaperFailCount = 0;

				const listWallpapers = updateAlbumDto.wallpapers || [];

				for (const wallpaper of listWallpapers) {
					try {
						// Check if wallpaper already exists in album
						if (album.wallpaperIds.includes(wallpaper.id)) {
							wallpaperExistedCount++;
							continue;
						}

						// Create wallpaper record if not exists
						const existingWallpaper = await this.prisma.wallpaper.findUnique({
							where: { id: wallpaper.id },
						});

						if (!existingWallpaper) {
							await this.prisma.wallpaper.create({
								data: {
									id: wallpaper.id,
									name: "",
									url: wallpaper.image_url,
									preview_url: wallpaper.image_url,
									albumId: updateAlbumDto.albumId,
									modelId: wallpaper.model_id || "",
									authorId: wallpaper.author_id || "",
									folderNo: wallpaper.folder_no || "",
									trackingType: wallpaper.tracking_type || "",
									trackingCollectionId: wallpaper.tracking_collection_id || 0,
								},
							});
						}

						// Add wallpaper ID to album
						await this.prisma.album.update({
							where: { id: updateAlbumDto.albumId },
							data: {
								wallpaperIds: {
									push: wallpaper.id,
								},
							},
						});

						wallpaperSuccessCount++;
					} catch (error) {
						wallpaperFailCount++;
						this.logger.error(
							`[x] - Error adding wallpaper (${wallpaper.id}) into album: ${error.message}`,
						);
					}
				}

				message = `success: ${wallpaperSuccessCount}, existed: ${wallpaperExistedCount}, fail: ${wallpaperFailCount}`;
			} else if (typeHandler.toUpperCase() === "UPDATE") {
				// Update album data logic
				const albumData = updateAlbumDto.albumData;
				const remainingIds = updateAlbumDto.wallpapers || [];

				const updateData: any = {};

				if (albumData?.thumbId) {
					updateData.thumb = albumData.thumbId;
				}
				if (albumData?.albumName) {
					updateData.name = albumData.albumName;
				}
				if (albumData?.albumTags) {
					updateData.tags = albumData.albumTags;
				}
				if (albumData?.albumCountries) {
					updateData.countries = albumData.albumCountries;
				}

				// Remove wallpapers
				if (remainingIds.length > 0) {
					updateData.wallpaperIds = album.wallpaperIds.filter((id) => !remainingIds.includes(id));

					// Remove wallpapers from database
					await this.removeWallpapersProcess(remainingIds);
				}

				await this.prisma.album.update({
					where: { id: updateAlbumDto.albumId },
					data: updateData,
				});

				message = `Album updated successfully`;
			}

			this.logger.log(`[!] - ${message}`);
		} catch (e) {
			error = true;
			message = `${typeHandler.toUpperCase()} wallpapers into album error: ${e.message}`;
			this.logger.error(`[x] - ${message}`);
		}

		return { error, message };
	}

	async deleteAlbum(albumId: number): Promise<void> {
		this.logger.log(`[!] Delete album: ${albumId}`);

		const album = await this.prisma.album.findUnique({
			where: { id: albumId },
		});

		if (!album) {
			throw new Error(`Album not found: ${albumId}`);
		}

		// Remove wallpapers of album
		if (album.wallpaperIds.length > 0) {
			await this.removeWallpapersProcess(album.wallpaperIds);
		}

		// Remove album data
		await this.prisma.album.delete({
			where: { id: albumId },
		});

		this.logger.log(`[!] - Delete album success`);
	}

	async verifyAlbum(albumId: number, verifyType: string): Promise<any> {
		let message: string;

		try {
			this.logger.log(`[!] Verify images of album: ${albumId}`);

			if (verifyType === "NSFW") {
				const listRacy: string[] = [];
				const listAdult: string[] = [];

				const album = await this.prisma.album.findUnique({
					where: { id: albumId },
				});

				if (!album) {
					throw new Error(`Album not found: ${albumId}`);
				}

				const wallpapers = await this.prisma.wallpaper.findMany({
					where: {
						id: { in: album.wallpaperIds },
					},
				});

				for (const wallpaper of wallpapers) {
					const { adult, racy } = await this.nsfwService.detectNsfw(wallpaper.preview_url);
					if (adult) listAdult.push(wallpaper.id);
					if (racy) listRacy.push(wallpaper.id);

					this.logger.log(
						`[!] - Verify wallpaper: ${adult ? "ADULT" : racy ? "RACY" : "NORMAL"} | ${wallpaper.preview_url}`,
					);
				}

				this.logger.log(`[!] - Result: ${listAdult.length} adults, ${listRacy.length} racy`);

				// Update albums data
				if (listRacy.length > 0 || listAdult.length > 0) {
					await this.prisma.album.update({
						where: { id: albumId },
						data: {
							nsfwAdult: listAdult,
							nsfwRacy: listRacy,
						},
					});
				}

				message = `Result of verify: ${listAdult.length} adults, ${listRacy.length} racy`;
				return { message, result: { adult: listAdult, racy: listRacy } };
			}
		} catch (error) {
			this.logger.error(`[x] - Error verifying: ${error.message}`);
			message = `Error verify: ${error.message}`;
		}

		return { message };
	}

	private async removeWallpapersProcess(wallpaperIds: string[]): Promise<void> {
		this.logger.log(`[!] - Removing ${wallpaperIds.length} wallpapers from album...`);

		// Remove wallpapers that are in this album
		const wallpapersToRemove = await this.prisma.wallpaper.findMany({
			where: {
				id: { in: wallpaperIds },
			},
		});

		// Delete the wallpaper records
		await this.prisma.wallpaper.deleteMany({
			where: {
				id: { in: wallpaperIds },
			},
		});

		// Update SeaArt works status to mark them as available again
		for (const wallpaper of wallpapersToRemove) {
			await this.removeFromBlacklist(wallpaper.id, wallpaper.folderNo, {
				provider: "seaart.ai",
				targetId: wallpaper.authorId,
				type: wallpaper.trackingType,
			});
		}

		this.logger.log(`[!] - Successfully removed ${wallpapersToRemove.length} wallpapers`);
	}

	private async removeFromBlacklist(
		wallpaperId: string,
		collection_id: string,
		track_collection: any,
	): Promise<void> {
		try {
			if (track_collection.type === "collection") {
				// Update SeaArt collection item status
				await this.prisma.seaArtWork.updateMany({
					where: {
						id: wallpaperId,
						folderNo: collection_id,
						authorId: track_collection.targetId,
					},
					data: {
						status: true,
					},
				});
			} else if (track_collection.type === "work") {
				// Update SeaArt work status
				await this.prisma.seaArtWork.updateMany({
					where: {
						id: wallpaperId,
						authorId: track_collection.targetId,
					},
					data: {
						status: true,
					},
				});
			}

			this.logger.log(
				`[!] - Remove wallpaper has id '${wallpaperId}' (target: ${track_collection.targetId}) from album successfully.`,
			);
		} catch (error) {
			this.logger.error(`[x] - Remove wallpaper has id ${wallpaperId} from album failed: ${error.message}`);
		}
	}
}
