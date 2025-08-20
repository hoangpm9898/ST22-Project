import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaRepository } from "#root/modules/prisma/prisma.repository";
import { ensureJSONFileAndWrite, readJSONFile } from "#root/common/utils";
import { config } from "#root/config";
import { CreateProfileDto, ProfileDto, ProfileInfoDto, ProfileWallpaperDto } from "./dto";
import * as path from "path";
import { NsfwVerificationService } from "#root/modules/nsfw/nsfw-verification.service";
import { CdnService } from "#root/modules/cdn/cdn.service";
import { promises } from "fs";

@Injectable()
export class ProfileService implements OnModuleInit {
	private allWallpapers: ProfileWallpaperDto[] = [];
	private allWallpaperIdSet: Set<string> = new Set();
	private allProfiles: ProfileDto[] = [];

	constructor(
		private prisma: PrismaRepository,
		private cdnService: CdnService,
		private nsfwService: NsfwVerificationService,
	) {}

	async onModuleInit() {
		await this.loadAllData();
	}

	private async loadAllData() {
		await Promise.all([this.loadAllProfileWallpapers(), this.loadAllProfiles()]);
	}

	private async loadAllProfileWallpapers() {
		this.allWallpapers = await readJSONFile<ProfileWallpaperDto>(config.PROFILES_WALLPAPERS_PATH);
		this.allWallpaperIdSet = new Set(this.allWallpapers.map((w) => w.id));
		console.log(`\n[!] Loaded ${this.allWallpapers.length} profile wallpapers initially`);
	}

	private async loadAllProfiles() {
		this.allProfiles = await readJSONFile<ProfileDto>(config.PROFILES_DATA_PATH);
		console.log(`\n[!] Loaded ${this.allProfiles.length} profiles initially`);
	}

	private async updateAllProfileWallpapers(wallpapers: ProfileWallpaperDto[]) {
		await ensureJSONFileAndWrite(config.PROFILES_WALLPAPERS_PATH, wallpapers);
		await this.loadAllProfileWallpapers();
	}

	private async updateAllProfiles(profiles: ProfileDto[]) {
		await ensureJSONFileAndWrite(config.PROFILES_DATA_PATH, profiles);
		await this.loadAllProfiles();
	}

	// Public methods
	async getProfilesInfo(): Promise<ProfileInfoDto> {
		console.log(`\n[!] Get profiles info...`);
		const totalProfiles = this.allProfiles.length;
		const totalWallpapers = this.allWallpapers.length;
		console.log(`[!] - Get profiles info success: ${totalProfiles} profiles, ${totalWallpapers} wallpapers`);

		return {
			profiles: totalProfiles,
			wallpapers: totalWallpapers,
		};
	}

	async getProfile(profileId: number): Promise<ProfileDto> {
		console.log(`\n[!] Get profile: ${profileId}`);

		const profile = this.allProfiles.find((profile) => profile.id === profileId);
		if (!profile) {
			throw new Error(`Profile not found: ${profileId}`);
		}

		console.log(`[!] - Get profile success, has name: ${profile.name}`);
		return profile;
	}

	async getImagesByProfileId(
		profileId: number,
		getFullFields?: boolean,
		getHighQualityUrl?: boolean,
	): Promise<any[]> {
		console.log(`\n[!] Get images of profile: ${profileId}`);

		const profile = this.allProfiles.find((profile) => profile.id === profileId);
		if (!profile) {
			throw new Error(`Profile not found: ${profileId}`);
		}

		let wallpaperUrls: any[];

		if (getFullFields) {
			wallpaperUrls = this.allWallpapers.filter((wallpaper) => profile.wallpaperIds.includes(wallpaper.id));
		} else {
			wallpaperUrls = this.allWallpapers
				.filter((wallpaper) => profile.wallpaperIds.includes(wallpaper.id))
				.map((wallpaper) => (getHighQualityUrl ? wallpaper.url : wallpaper.preview_url));
		}

		console.log(`[!] - Get images of profile success, has ${wallpaperUrls.length} images`);
		return wallpaperUrls;
	}

	async listProfiles(): Promise<ProfileDto[]> {
		console.log(`\n[!] List all profiles`);
		console.log(`[!] - List all profiles success, has ${this.allProfiles.length} profiles`);
		return this.allProfiles;
	}

	async createProfile(createProfileDto: CreateProfileDto): Promise<ProfileDto> {
		const profileId = Date.now();
		console.log(`\n[!] Create a new profile: ${profileId}`);

		const newProfile: ProfileDto = {
			id: profileId,
			name: createProfileDto.name,
			thumb: "",
			avatarPath: "",
			backgroundPath: "",
			wallpaperIds: createProfileDto.wallpaperIds || [],
			nsfw: { adult: [], racy: [] },
		};

		this.allProfiles.push(newProfile);
		await this.updateAllProfiles(this.allProfiles);

		console.log(`[!] - Create new profile success, has ${this.allProfiles.length} profiles`);
		return newProfile;
	}

	async deleteProfile(profileId: number): Promise<void> {
		console.log(`\n[!] Delete profile: ${profileId}`);

		const profileIndex = this.allProfiles.findIndex((profile) => profile.id === profileId);
		if (profileIndex === -1) {
			throw new Error(`Profile not found: ${profileId}`);
		}

		// Remove wallpapers of profile
		const wallpaperIds = this.allProfiles[profileIndex].wallpaperIds;
		if (wallpaperIds.length > 0) {
			await this.removeWallpapersProcess(wallpaperIds);
		}

		// Remove profile data
		this.allProfiles.splice(profileIndex, 1);
		await this.updateAllProfiles(this.allProfiles);

		console.log(`[!] - Delete profile success, has ${this.allProfiles.length} profiles`);
	}

	async verifyProfile(profileId: number, verifyType: string): Promise<any> {
		let message: string;

		try {
			console.log(`\n[!] Verify images of profile: ${profileId}`);

			if (verifyType === "NSFW") {
				const listRacy: string[] = [];
				const listAdult: string[] = [];

				const profile = this.allProfiles.find((profile) => profile.id === profileId);
				if (!profile) {
					throw new Error(`Profile not found: ${profileId}`);
				}

				const wallpapers = this.allWallpapers.filter((wallpaper) =>
					profile.wallpaperIds.includes(wallpaper.id),
				);

				for (const wallpaper of wallpapers) {
					const { adult, racy } = await this.nsfwService.detectNsfw(wallpaper.preview_url);
					if (adult) listAdult.push(wallpaper.id);
					if (racy) listRacy.push(wallpaper.id);

					console.log(
						`[!] - Verify wallpaper: ${adult ? "ADULT" : racy ? "RACY" : "NORMAL"} | ${wallpaper.preview_url}`,
					);
				}

				console.log(`[!] - Result: ${listAdult.length} adults, ${listRacy.length} racy`);

				// Update profiles data
				if (listRacy.length > 0 || listAdult.length > 0) {
					const newAllProfiles = this.allProfiles.map((profile) => {
						if (profile.id === profileId) {
							profile.nsfw.adult = listAdult;
							profile.nsfw.racy = listRacy;
						}
						return profile;
					});
					await this.updateAllProfiles(newAllProfiles);
				}

				message = `Result of verify: ${listAdult.length} adults, ${listRacy.length} racy`;
				return { message, result: { adult: listAdult, racy: listRacy } };
			}
		} catch (error) {
			console.error(`[x] - Error verifying: ${error.message}`);
			message = `Error verify: ${error.message}`;
		}

		return { message };
	}

	async uploadImageFile(profileId: number, fileType: string, file: Express.Multer.File): Promise<string> {
		console.log(`\n[!] Upload ${fileType} of profile: ${profileId}`);

		if (!profileId || !fileType || !file) {
			throw new Error("Missing required parameters");
		}

		// Generate unique filename
		const filePath = path.join("data", "profiles", "uploads", `${profileId}-${fileType}-${Date.now()}.webp`);

		// Save file (async)
		await promises.writeFile(filePath, file.buffer);

		// Return relative path for client use
		return filePath;
	}

	private async removeWallpapersProcess(wallpaperIds: string[]): Promise<void> {
		const { listIncluded, listExcluded } = this.allWallpapers.reduce(
			(result, w) => {
				if (wallpaperIds.includes(w.id)) {
					result.listIncluded.push(w);
				} else {
					result.listExcluded.push(w);
				}
				return result;
			},
			{ listIncluded: [], listExcluded: [] },
		);

		console.log(
			`[!] - Remove ${listExcluded.length} wallpapers, change collection status for ${listIncluded.length} wallpapers...`,
		);

		// Remove wallpapers from list
		await this.updateAllProfileWallpapers(listExcluded);

		// Change status of wallpapers in collections
		for (const wallpaper of listIncluded) {
			await this.removeFromBlacklist(wallpaper.id, wallpaper.folder_no, {
				provider: "seaart.ai",
				targetId: wallpaper.author_id,
				type: wallpaper.tracking_type,
			});
		}
	}

	private async removeFromBlacklist(
		wallpaperId: string,
		collection_id: string,
		track_collection: any,
	): Promise<void> {
		try {
			let filePath: string;

			if (track_collection.type === "collection") {
				filePath = `data/collections/${track_collection.provider}/collections/${track_collection.targetId}/${collection_id}.json`;
			} else if (track_collection.type === "work") {
				filePath = `data/collections/${track_collection.provider}/works/${track_collection.targetId}.json`;
			}

			const wallpapers = await readJSONFile(filePath);
			const wallpapersUpdated = wallpapers.map((w: any) => {
				if (w.id === wallpaperId) {
					return { ...w, status: true };
				}
				return w;
			});

			await ensureJSONFileAndWrite(filePath, wallpapersUpdated);
			console.log(
				`[!] - Remove wallpaper has id '${wallpaperId}' (target: ${track_collection.targetId}) from profile successfully.`,
			);
		} catch (error) {
			console.error(`[x] - Remove wallpaper has id ${wallpaperId} from profile failed: ${error.message}`);
		}
	}
}
