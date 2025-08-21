import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaRepository } from "#root/modules/prisma/prisma.repository";
import { CreateProfileDto, ProfileDto, ProfileInfoDto, UpdateProfileDto, UpdateProfileDetailDto } from "./dto";
import * as path from "path";
import { NsfwVerificationService } from "#root/modules/nsfw/nsfw-verification.service";
import { CdnService } from "#root/modules/cdn/cdn.service";
import { promises } from "fs";

@Injectable()
export class ProfileService implements OnModuleInit {
	private readonly logger: Logger = new Logger(ProfileService.name);
	constructor(
		private prisma: PrismaRepository,
		private cdnService: CdnService,
		private nsfwService: NsfwVerificationService,
	) {}

	async onModuleInit() {
		this.logger.log("ProfileService initialized with Prisma MongoDB connection");
	}

	// Public methods
	async getProfilesInfo(): Promise<ProfileInfoDto> {
		this.logger.log(`\n[!] Get profiles info...`);

		const [totalProfiles, totalWallpapers] = await Promise.all([
			this.prisma.profile.count(),
			this.prisma.wallpaper.count({
				where: {
					albumId: null, // Profile wallpapers don't have albumId
				},
			}),
		]);

		this.logger.log(`[!] - Get profiles info success: ${totalProfiles} profiles, ${totalWallpapers} wallpapers`);

		return {
			profiles: totalProfiles,
			wallpapers: totalWallpapers,
		};
	}

	async getProfile(profileId: number): Promise<ProfileDto> {
		this.logger.log(`\n[!] Get profile: ${profileId}`);

		const profile = await this.prisma.profile.findUnique({
			where: { id: BigInt(profileId) },
		});

		if (!profile) {
			throw new Error(`Profile not found: ${profileId}`);
		}

		const profileDto: ProfileDto = {
			id: Number(profile.id),
			name: profile.name,
			thumb: profile.thumb,
			avatarPath: profile.avatarPath,
			backgroundPath: profile.backgroundPath,
			wallpaperIds: profile.wallpaperIds,
			nsfw: {
				adult: profile.nsfwAdult,
				racy: profile.nsfwRacy,
			},
		};

		this.logger.log(`[!] - Get profile success, has name: ${profile.name}`);
		return profileDto;
	}

	async getImagesByProfileId(
		profileId: number,
		getFullFields?: boolean,
		getHighQualityUrl?: boolean,
	): Promise<any[]> {
		this.logger.log(`\n[!] Get images of profile: ${profileId}`);

		const profile = await this.prisma.profile.findUnique({
			where: { id: BigInt(profileId) },
		});

		if (!profile) {
			throw new Error(`Profile not found: ${profileId}`);
		}

		const wallpapers = await this.prisma.wallpaper.findMany({
			where: {
				id: { in: profile.wallpaperIds },
			},
		});

		let wallpaperUrls: any[];

		if (getFullFields) {
			wallpaperUrls = wallpapers.map((w) => ({
				id: w.id,
				name: w.name,
				url: w.url,
				preview_url: w.preview_url,
				profileId: w.albumId ? null : Number(profile.id),
				model_id: w.modelId,
				author_id: w.authorId,
				folder_no: w.folderNo,
				tracking_type: w.trackingType,
				tracking_collection_id: w.trackingCollectionId,
			}));
		} else {
			wallpaperUrls = wallpapers.map((wallpaper) => (getHighQualityUrl ? wallpaper.url : wallpaper.preview_url));
		}

		this.logger.log(`[!] - Get images of profile success, has ${wallpaperUrls.length} images`);
		return wallpaperUrls;
	}

	async listProfiles(): Promise<ProfileDto[]> {
		this.logger.log(`\n[!] List all profiles`);

		const profiles = await this.prisma.profile.findMany({
			orderBy: { id: "desc" },
		});

		const profileDtos: ProfileDto[] = profiles.map((profile) => ({
			id: Number(profile.id),
			name: profile.name,
			thumb: profile.thumb,
			avatarPath: profile.avatarPath,
			backgroundPath: profile.backgroundPath,
			wallpaperIds: profile.wallpaperIds,
			nsfw: {
				adult: profile.nsfwAdult,
				racy: profile.nsfwRacy,
			},
		}));

		this.logger.log(`[!] - List all profiles success, has ${profiles.length} profiles`);
		return profileDtos;
	}

	async createProfile(createProfileDto: CreateProfileDto): Promise<ProfileDto> {
		const profileId = BigInt(Date.now());
		this.logger.log(`\n[!] Create a new profile: ${profileId}`);

		const newProfile = await this.prisma.profile.create({
			data: {
				id: profileId,
				name: createProfileDto.name,
				thumb: "",
				avatarPath: "",
				backgroundPath: "",
				wallpaperIds: createProfileDto.wallpaperIds || [],
				nsfwAdult: [],
				nsfwRacy: [],
			},
		});

		const profileDto: ProfileDto = {
			id: Number(newProfile.id),
			name: newProfile.name,
			thumb: newProfile.thumb,
			avatarPath: newProfile.avatarPath,
			backgroundPath: newProfile.backgroundPath,
			wallpaperIds: newProfile.wallpaperIds,
			nsfw: {
				adult: newProfile.nsfwAdult,
				racy: newProfile.nsfwRacy,
			},
		};

		this.logger.log(`[!] - Create new profile success`);
		return profileDto;
	}

	async updateProfile(typeHandler: string, updateProfileDto: UpdateProfileDto): Promise<any> {
		let error = false;
		let message: string;

		try {
			this.logger.log(`[!] ${typeHandler.toUpperCase()} wallpapers for profile: ${updateProfileDto.profileId}`);

			const profile = await this.prisma.profile.findUnique({
				where: { id: BigInt(updateProfileDto.profileId) },
			});

			if (!profile) {
				throw new Error(`Profile not found: ${updateProfileDto.profileId}`);
			}

			if (typeHandler.toUpperCase() === "ADD") {
				// Add new wallpapers logic
				let wallpaperSuccessCount = 0;
				let wallpaperExistedCount = 0;
				let wallpaperFailCount = 0;

				const listWallpapers = updateProfileDto.wallpapers || [];

				for (const wallpaper of listWallpapers) {
					try {
						// Check if wallpaper already exists in profile
						if (profile.wallpaperIds.includes(wallpaper.id)) {
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
									albumId: null, // Profile wallpapers don't have albumId
									modelId: wallpaper.model_id || "",
									authorId: wallpaper.author_id || "",
									folderNo: wallpaper.folder_no || "",
									trackingType: wallpaper.tracking_type || "",
									trackingCollectionId: wallpaper.tracking_collection_id || 0,
								},
							});
						}

						// Add wallpaper ID to profile
						await this.prisma.profile.update({
							where: { id: BigInt(updateProfileDto.profileId) },
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
							`[x] - Error adding wallpaper (${wallpaper.id}) into profile: ${error.message}`,
						);
					}
				}

				message = `success: ${wallpaperSuccessCount}, existed: ${wallpaperExistedCount}, fail: ${wallpaperFailCount}`;
			} else if (typeHandler.toUpperCase() === "UPDATE") {
				// Update profile data logic
				const profileData = updateProfileDto.profileData;
				const remainingIds = updateProfileDto.wallpapers || [];

				const updateData: any = {};

				if (profileData?.thumbId) {
					updateData.thumb = profileData.thumbId;
				}
				if (profileData?.profileName) {
					updateData.name = profileData.profileName;
				}

				// Remove wallpapers
				if (remainingIds.length > 0) {
					updateData.wallpaperIds = profile.wallpaperIds.filter((id) => !remainingIds.includes(id));

					// Remove wallpapers from database
					await this.removeWallpapersProcess(remainingIds);
				}

				await this.prisma.profile.update({
					where: { id: BigInt(updateProfileDto.profileId) },
					data: updateData,
				});

				message = `Profile updated successfully`;
			}

			this.logger.log(`[!] - ${message}`);
		} catch (e) {
			error = true;
			message = `${typeHandler.toUpperCase()} wallpapers into profile error: ${e.message}`;
			this.logger.error(`[x] - ${message}`);
		}

		return { error, message };
	}

	async updateProfileDetail(profileId: number, updateProfileDetailDto: UpdateProfileDetailDto): Promise<any> {
		let error = false;
		let message: string;

		this.logger.log(`\n[!] Update profile: ${profileId}`);

		try {
			const profile = await this.prisma.profile.findUnique({
				where: { id: BigInt(profileId) },
			});

			if (!profile) {
				throw new Error(`Profile not found: ${profileId}`);
			}

			// Find wallpapers to remove
			const remainingIds = profile.wallpaperIds.filter((id) => !updateProfileDetailDto.wallpaperIds.includes(id));

			// Update profile
			await this.prisma.profile.update({
				where: { id: BigInt(profileId) },
				data: {
					name: updateProfileDetailDto.name,
					thumb: updateProfileDetailDto.thumb || profile.thumb,
					avatarPath: updateProfileDetailDto.avatar || profile.avatarPath,
					backgroundPath: updateProfileDetailDto.background || profile.backgroundPath,
					wallpaperIds: updateProfileDetailDto.wallpaperIds,
				},
			});

			// Remove wallpapers if any
			if (remainingIds.length > 0) {
				await this.removeWallpapersProcess(remainingIds);
			}

			message = "Profile updated successfully";
		} catch (e) {
			error = true;
			message = `Update profile error: ${e.message}`;
			this.logger.error(`[x] - Update profile fail: ${message}`);
		}

		return { error, message };
	}

	async deleteProfile(profileId: number): Promise<void> {
		this.logger.log(`\n[!] Delete profile: ${profileId}`);

		const profile = await this.prisma.profile.findUnique({
			where: { id: BigInt(profileId) },
		});

		if (!profile) {
			throw new Error(`Profile not found: ${profileId}`);
		}

		// Remove wallpapers of profile
		if (profile.wallpaperIds.length > 0) {
			await this.removeWallpapersProcess(profile.wallpaperIds);
		}

		// Remove profile data
		await this.prisma.profile.delete({
			where: { id: BigInt(profileId) },
		});

		this.logger.log(`[!] - Delete profile success`);
	}

	async verifyProfile(profileId: number, verifyType: string): Promise<any> {
		let message: string;

		try {
			this.logger.log(`\n[!] Verify images of profile: ${profileId}`);

			if (verifyType === "NSFW") {
				const listRacy: string[] = [];
				const listAdult: string[] = [];

				const profile = await this.prisma.profile.findUnique({
					where: { id: BigInt(profileId) },
				});

				if (!profile) {
					throw new Error(`Profile not found: ${profileId}`);
				}

				const wallpapers = await this.prisma.wallpaper.findMany({
					where: {
						id: { in: profile.wallpaperIds },
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

				// Update profiles data
				if (listRacy.length > 0 || listAdult.length > 0) {
					await this.prisma.profile.update({
						where: { id: BigInt(profileId) },
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

	async uploadImageFile(profileId: number, fileType: string, file: Express.Multer.File): Promise<string> {
		this.logger.log(`\n[!] Upload ${fileType} of profile: ${profileId}`);

		if (!profileId || !fileType || !file) {
			throw new Error("Missing required parameters");
		}

		// Generate unique filename
		const filePath = path.join("data", "profiles", "uploads", `${profileId}-${fileType}-${Date.now()}.webp`);

		// Save file (async)
		await promises.writeFile(filePath, file.buffer);

		// Update profile with the new file path
		const updateData: any = {};
		if (fileType === "avatar") {
			updateData.avatarPath = filePath;
		} else if (fileType === "background") {
			updateData.backgroundPath = filePath;
		}

		if (Object.keys(updateData).length > 0) {
			await this.prisma.profile.update({
				where: { id: BigInt(profileId) },
				data: updateData,
			});
		}

		// Return relative path for client use
		return filePath;
	}

	private async removeWallpapersProcess(wallpaperIds: string[]): Promise<void> {
		this.logger.log(`[!] - Removing ${wallpaperIds.length} wallpapers from profile...`);

		// Get wallpapers that are being removed
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
				`[!] - Remove wallpaper has id '${wallpaperId}' (target: ${track_collection.targetId}) from profile successfully.`,
			);
		} catch (error) {
			this.logger.error(`[x] - Remove wallpaper has id ${wallpaperId} from profile failed: ${error.message}`);
		}
	}
}
