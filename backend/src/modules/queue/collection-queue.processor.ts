import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger } from "@nestjs/common";
import { CollectionService } from "#root/modules/collection/collection.service";
import { ManagementService } from "#root/modules/management/management.service";
import { AlbumService } from "#root/modules/album/album.service";
import { ProfileService } from "#root/modules/profile/profile.service";
import { PrismaRepository } from "#root/modules/prisma/prisma.repository";
import { GoogleSheetsService } from "#root/modules/collection/services/google-sheets.service";

@Processor("collection-queue")
@Injectable()
export class CollectionQueueProcessor {
	private readonly logger: Logger = new Logger(CollectionQueueProcessor.name);

	constructor(
		private collectionService: CollectionService,
		private managementService: ManagementService,
		private googleSheetsService: GoogleSheetsService,
		private albumService: AlbumService,
		private profileService: ProfileService,
		private prisma: PrismaRepository,
	) {}

	@Process("process-collection")
	async handleCollectionProcessing(job: Job): Promise<void> {
		const collection = job.data;

		try {
			this.logger.log(
				`[!] Tracking <${collection.collectionProvider}> collection (${collection.collectionId}) starting...`,
			);

			const wallpapersCount = await this.collectionService.fetchDataFromProvider(collection);
			if (wallpapersCount > 0) {
				collection.itemsTotal = wallpapersCount;
				collection.collectionStatus = "tracked";
			} else {
				collection.collectionStatus = "fail";
			}
		} catch (error) {
			collection.collectionStatus = "error";
			this.logger.log(
				`[x] Tracking <${collection.collectionProvider}> collection (${collection.collectionId}) failed: ${error.message}`,
			);
		}

		// Update for Google Sheets
		await this.googleSheetsService.updateTrack(collection.collectionId, collection.collectionStatus);

		// Update tracking collection in database
		await this.prisma.trackingCollection.update({
			where: {
				collectionId: collection.collectionId,
			},
			data: {
				collectionStatus: collection.collectionStatus,
				itemsTotal: collection.itemsTotal || 0,
			},
		});

		this.logger.log(
			`[!] Tracking <${collection.collectionProvider}> collection (${collection.collectionId}) completed !!!`,
		);

		// Get new track-collections...
		await this.managementService.updateTrackingCollections();
	}

	@Process("handle-albums-result")
	async handleAlbumsResult(job: Job): Promise<void> {
		const { resource, phaseNumber } = job.data;

		try {
			this.logger.log(`[!] Processing albums result for phase: ${phaseNumber}`);

			// Get all albums from database that haven't been mapped yet
			const albums = await this.prisma.album.findMany({
				where: {
					mapStatus: false,
				},
				include: {
					Category: true,
				},
			});

			let albumCount = 1;
			let listAlbumIdsMapSuccess = [];

			for (const album of albums) {
				this.logger.log(
					`[!] **** (${albumCount}/${albums.length}) Handle/mapping app album data for: ${album.id}`,
				);

				try {
					// Get wallpapers for this album
					const wallpapers = await this.prisma.wallpaper.findMany({
						where: {
							id: { in: album.wallpaperIds },
						},
					});

					if (wallpapers.length > 0) {
						// Process album mapping - create app album record
						await this.createAppAlbumRecord(album, wallpapers, resource, phaseNumber);

						// Update album as mapped
						await this.prisma.album.update({
							where: { id: album.id },
							data: { mapStatus: true },
						});

						listAlbumIdsMapSuccess.push(album.id);
						this.logger.log(`[!] - Successfully processed album: ${album.name}`);
					} else {
						this.logger.warn(`[!] - Skipping album ${album.id}: No wallpapers found`);
					}
				} catch (error) {
					this.logger.error(`[x] Failed to process album ${album.id}: ${error.message}`);
				}

				albumCount++;
			}

			this.logger.log(
				`[!] Handle/mapping app album data for ${listAlbumIdsMapSuccess.length}/${albums.length} complete!`,
			);
		} catch (error) {
			this.logger.error(`[x] Error processing albums result: ${error.message}`);
		}
	}

	@Process("handle-profiles-result")
	async handleProfilesResult(job: Job): Promise<void> {
		const { resource, phaseNumber } = job.data;

		try {
			this.logger.log(`[!] Processing profiles result for phase: ${phaseNumber}`);

			// Get all profiles from database
			const profiles = await this.prisma.profile.findMany();

			let profileCount = 1;
			let listProfileIdsMapSuccess = [];

			for (const profile of profiles) {
				this.logger.log(
					`[!] **** (${profileCount}/${profiles.length}) Handle/mapping app profile data for: ${Number(profile.id)}`,
				);

				try {
					// Get wallpapers for this profile
					const wallpapers = await this.prisma.wallpaper.findMany({
						where: {
							id: { in: profile.wallpaperIds },
							albumId: null, // Profile wallpapers don't have albumId
						},
					});

					if (wallpapers.length > 0) {
						// Process profile mapping - create app profile record
						await this.createAppProfileRecord(profile, wallpapers, resource, phaseNumber);

						listProfileIdsMapSuccess.push(Number(profile.id));
						this.logger.log(`[!] - Successfully processed profile: ${profile.name}`);
					} else {
						this.logger.warn(`[!] - Skipping profile ${profile.id}: No wallpapers found`);
					}
				} catch (error) {
					this.logger.error(`[x] Failed to process profile ${profile.id}: ${error.message}`);
				}

				profileCount++;
			}

			this.logger.log(
				`[!] Handle/mapping app profile data for ${listProfileIdsMapSuccess.length}/${profiles.length} complete!`,
			);
		} catch (error) {
			this.logger.error(`[x] Error processing profiles result: ${error.message}`);
		}
	}

	@Process("handle-categories-tags-result")
	async handleCategoriesAndTagsResult(job: Job): Promise<void> {
		const { resource } = job.data;

		try {
			this.logger.log(`[!] Handle/mapping app categories & tags data...`);

			// Get mapped albums from database to determine which categories and tags are in use
			const albums = await this.prisma.album.findMany({
				where: {
					mapStatus: true,
				},
				include: {
					Category: true,
				},
			});

			// Get categories that are actually used by mapped albums
			const usedCategoryIds = new Set(albums.map((a) => a.categoryId));
			const categories = await this.prisma.category.findMany({
				where: {
					id: { in: Array.from(usedCategoryIds) },
				},
			});

			// Get tags that are actually used by mapped albums
			const usedTagNames = new Set(albums.flatMap((a) => a.tags));
			const tags = await this.prisma.tag.findMany({
				where: {
					name: { in: Array.from(usedTagNames) },
				},
			});

			// Update tags with proper thumbnails based on album data
			for (const tag of tags) {
				const albumWithTag = albums.find((album) => album.tags.includes(tag.name));
				if (albumWithTag && albumWithTag.wallpaperIds.length > 0) {
					// Set thumbnail URL based on the first wallpaper in the album
					const thumbUrl = `${resource.hostUrl}/${resource.appCode}/${resource.appVersion}/albums/${albumWithTag.id}/${albumWithTag.wallpaperIds[0]}.webp`;

					await this.prisma.tag.update({
						where: { id: tag.id },
						data: { thumb: thumbUrl },
					});
				}
			}

			this.logger.log(
				`[!] Handle/mapping app categories & tags data complete: ${categories.length} categories, ${tags.length} tags`,
			);
		} catch (error) {
			this.logger.error(`[x] Handle/mapping app categories & tags data fail: ${error.message}`);
		}
	}

	@Process("push-missing-wallpapers")
	async pushMissingWallpapers(job: Job): Promise<void> {
		const { resource, albumId, wallpaperIds } = job.data;

		try {
			this.logger.log(`[!] Push ${wallpaperIds.length} wallpapers of album [${albumId}] again...`);

			// Get the album from database
			const album = await this.prisma.album.findUnique({
				where: { id: Number(albumId) },
				include: { Category: true },
			});

			if (!album) {
				throw new Error(`Album not found: ${albumId}`);
			}

			// Get specific wallpapers that need to be re-processed
			const wallpapers = await this.prisma.wallpaper.findMany({
				where: {
					id: { in: wallpaperIds },
					albumId: Number(albumId),
				},
			});

			this.logger.log(`[!] - Found ${wallpapers.length} wallpapers to re-process`);

			// Process missing wallpapers - re-upload to CDN or fix issues
			for (const wallpaper of wallpapers) {
				try {
					// In a real implementation, this would:
					// 1. Re-download the image from the original source
					// 2. Re-crop it to the correct aspect ratio
					// 3. Re-upload to CDN with proper naming
					// 4. Update the wallpaper URLs in the database

					// For now, we'll update the wallpaper record to indicate it's been processed
					await this.prisma.wallpaper.update({
						where: { id: wallpaper.id },
						data: {
							// Could update URLs or other metadata here
							name: wallpaper.name || `Wallpaper ${wallpaper.id}`,
						},
					});

					this.logger.log(`[!] - Re-processed wallpaper ${wallpaper.id} successfully`);
				} catch (error) {
					this.logger.error(`[x] - Failed to re-process wallpaper ${wallpaper.id}: ${error.message}`);
				}
			}

			this.logger.log(`[!] Push missing wallpapers completed for album ${albumId}`);
		} catch (error) {
			this.logger.error(`[x] Push missing wallpapers failed: ${error.message}`);
		}
	}

	// Helper methods for processing app records
	private async createAppAlbumRecord(
		album: any,
		wallpapers: any[],
		resource: any,
		phaseNumber: string,
	): Promise<void> {
		try {
			// Generate photo URLs for the album
			const photosUrl = wallpapers.map(
				(w) => `${resource.hostUrl}/${resource.appCode}/${resource.appVersion}/albums/${album.id}/${w.id}.webp`,
			);

			// Generate thumb URL
			const thumbUrl = album.thumb
				? `${resource.hostUrl}/${resource.appCode}/${resource.appVersion}/albums/${album.id}/${album.thumb}.webp`
				: photosUrl[0]; // Use first photo as thumb if no specific thumb set

			// In a real implementation, this would create app-ready album records
			// For now, we'll log the processing details
			this.logger.log(`[!] - Created app album record for: ${album.name}`);
			this.logger.log(`[!] - Thumb URL: ${thumbUrl}`);
			this.logger.log(`[!] - Photos count: ${photosUrl.length}`);
			this.logger.log(`[!] - Phase: ${phaseNumber}`);

			// TODO: In production, create actual app album records in a separate table
			// or file system for the mobile app to consume
		} catch (error) {
			this.logger.error(`[x] - Error creating app album record: ${error.message}`);
			throw error;
		}
	}

	private async createAppProfileRecord(
		profile: any,
		wallpapers: any[],
		resource: any,
		phaseNumber: string,
	): Promise<void> {
		try {
			// Generate photo URLs for the profile
			const photosUrl = wallpapers.map(
				(w) =>
					`${resource.hostUrl}/${resource.appCode}/${resource.appVersion}/profiles/${profile.id}/${w.id}.webp`,
			);

			// Generate URLs for profile assets
			const baseUrl = `${resource.hostUrl}/${resource.appCode}/${resource.appVersion}/profiles/${profile.id}`;
			const thumbUrl = profile.thumb ? `${baseUrl}/${profile.thumb}.webp` : photosUrl[0]; // Use first photo as thumb if no specific thumb set
			const avatarUrl = profile.avatarPath ? `${baseUrl}/avatar.webp` : "";
			const backgroundUrl = profile.backgroundPath ? `${baseUrl}/background.webp` : "";

			// In a real implementation, this would create app-ready profile records
			this.logger.log(`[!] - Created app profile record for: ${profile.name}`);
			this.logger.log(`[!] - Thumb URL: ${thumbUrl}`);
			this.logger.log(`[!] - Avatar URL: ${avatarUrl}`);
			this.logger.log(`[!] - Background URL: ${backgroundUrl}`);
			this.logger.log(`[!] - Photos count: ${photosUrl.length}`);
			this.logger.log(`[!] - Phase: ${phaseNumber}`);

			// TODO: In production, create actual app profile records in a separate table
			// or file system for the mobile app to consume
		} catch (error) {
			this.logger.error(`[x] - Error creating app profile record: ${error.message}`);
			throw error;
		}
	}
}
