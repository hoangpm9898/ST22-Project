import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaRepository } from "#root/modules/prisma/prisma.repository";
import { readJSONFile, ensureJSONFileAndWrite } from "#root/common/utils";
import { CdnService, NsfwVerificationService } from "#root/common/services";
import { config } from "#root/config";
import { AlbumDto, AlbumWallpaperDto, CategoryDto, TagDto, CountryDto, CreateAlbumDto, AlbumInfoDto } from "./dto";

@Injectable()
export class AlbumService implements OnModuleInit {
	private allCategories: CategoryDto[] = [];
	private allTags: TagDto[] = [];
	private allCountries: CountryDto[] = [];
	private allWallpapers: AlbumWallpaperDto[] = [];
	private allWallpaperIdSet: Set<string> = new Set();
	private allAlbums: AlbumDto[] = [];

	constructor(
		private prisma: PrismaRepository,
		private cdnService: CdnService,
		private nsfwService: NsfwVerificationService,
	) {}

	async onModuleInit() {
		await this.loadAllData();
	}

	private async loadAllData() {
		await Promise.all([
			this.loadAllCategories(),
			this.loadAllTags(),
			this.loadAllCountries(),
			this.loadAllWallpapers(),
			this.loadAllAlbums(),
		]);
	}

	private async loadAllCategories() {
		const categories = await readJSONFile<CategoryDto>("data/albums/categories.json");
		this.allCategories = categories;
		console.log(`\n[!] Loaded ${this.allCategories.length} categories initially`);
	}

	private async loadAllTags() {
		const tags = await readJSONFile<TagDto>("data/albums/tags.json");
		this.allTags = tags;
		console.log(`\n[!] Loaded ${this.allTags.length} tags initially`);
	}

	private async loadAllCountries() {
		const countries = await readJSONFile<CountryDto>("data/albums/countries.json");
		this.allCountries = countries;
		console.log(`\n[!] Loaded ${this.allCountries.length} countries initially`);
	}

	private async loadAllWallpapers() {
		const wallpapers = await readJSONFile<AlbumWallpaperDto>(config.WALLPAPERS_PATH);
		this.allWallpapers = wallpapers;
		this.allWallpaperIdSet = new Set(this.allWallpapers.map((w) => w.id));
		console.log(`\n[!] Loaded ${this.allWallpapers.length} wallpapers initially`);
	}

	private async loadAllAlbums() {
		const albums = await readJSONFile<AlbumDto>(config.ALBUMS_PATH);
		this.allAlbums = albums;
		console.log(`\n[!] Loaded ${this.allAlbums.length} albums initially`);
	}

	private async updateAllCategories(categories: CategoryDto[]) {
		await ensureJSONFileAndWrite("data/albums/categories.json", categories);
		await this.loadAllCategories();
	}

	private async updateAllTags(tags: TagDto[]) {
		await ensureJSONFileAndWrite("data/albums/tags.json", tags);
		await this.loadAllTags();
	}

	private async updateAllCountries(countries: CountryDto[]) {
		await ensureJSONFileAndWrite("data/albums/countries.json", countries);
		await this.loadAllCountries();
	}

	private async updateAllWallpapers(wallpapers: AlbumWallpaperDto[]) {
		await ensureJSONFileAndWrite(config.WALLPAPERS_PATH, wallpapers);
		await this.loadAllWallpapers();
	}

	private async updateAllAlbums(albums: AlbumDto[]) {
		await ensureJSONFileAndWrite(config.ALBUMS_PATH, albums);
		await this.loadAllAlbums();
	}

	// Public methods
	async getCategories(): Promise<CategoryDto[]> {
		console.log(`\n[!] Get all categories`);
		console.log(`[!] - Get all categories success, has ${this.allCategories.length} categories`);
		return this.allCategories;
	}

	async getTags(): Promise<TagDto[]> {
		console.log(`\n[!] Get all tags`);
		console.log(`[!] - Get all tags success, has ${this.allTags.length} tags`);
		return this.allTags;
	}

	async getAlbumsInfo(): Promise<AlbumInfoDto> {
		console.log(`\n[!] Get albums info...`);
		const totalAlbums = this.allAlbums.length;
		const totalWallpapers = this.allWallpapers.length;
		const totalCategories = this.allCategories.length;
		const totalTags = this.allTags.length;

		console.log(
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
		console.log(`\n[!] Get album: ${albumId}`);

		const album = this.allAlbums.find((album) => album.id === albumId);
		if (!album) {
			throw new Error(`Album not found: ${albumId}`);
		}

		console.log(`[!] - Get album success, has name: ${album.name}`);
		return album;
	}

	async getImagesByAlbumId(albumId: number, getFullFields?: boolean, getHighQualityUrl?: boolean): Promise<any[]> {
		console.log(`\n[!] Get images of album: ${albumId}`);

		const album = this.allAlbums.find((album) => album.id === albumId);
		if (!album) {
			throw new Error(`Album not found: ${albumId}`);
		}

		let wallpaperUrls: any[];

		if (getFullFields) {
			wallpaperUrls = this.allWallpapers.filter((wallpaper) => album.wallpaperIds.includes(wallpaper.id));
		} else {
			wallpaperUrls = this.allWallpapers
				.filter((wallpaper) => album.wallpaperIds.includes(wallpaper.id))
				.map((wallpaper) => (getHighQualityUrl ? wallpaper.url : wallpaper.preview_url));
		}

		console.log(`[!] - Get images of album success, has ${wallpaperUrls.length} images`);
		return wallpaperUrls;
	}

	async listAlbums(): Promise<AlbumDto[]> {
		console.log(`\n[!] List all albums`);
		console.log(`[!] - List all albums success, has ${this.allAlbums.length} albums`);
		return this.allAlbums;
	}

	async createAlbum(createAlbumDto: CreateAlbumDto): Promise<AlbumDto> {
		const albumId = Date.now();
		console.log(`\n[!] Create a new album: ${albumId}`);

		const newAlbum: AlbumDto = {
			id: albumId,
			name: createAlbumDto.albumName,
			categoryId: 0,
			thumb: "",
			tags: [],
			countries: [],
			wallpaperIds: createAlbumDto.wallpaperIds || [],
			nsfw: { adult: [], racy: [] },
			mapStatus: false,
		};

		this.allAlbums.push(newAlbum);
		await this.updateAllAlbums(this.allAlbums);

		console.log(`[!] - Create new album success, has ${this.allAlbums.length} albums`);
		return newAlbum;
	}

	async deleteAlbum(albumId: number): Promise<void> {
		console.log(`\n[!] Delete album: ${albumId}`);

		const albumIndex = this.allAlbums.findIndex((album) => album.id === albumId);
		if (albumIndex === -1) {
			throw new Error(`Album not found: ${albumId}`);
		}

		// Remove wallpapers of album
		const wallpaperIds = this.allAlbums[albumIndex].wallpaperIds;
		if (wallpaperIds.length > 0) {
			await this.removeWallpapersProcess(wallpaperIds);
		}

		// Remove album data
		this.allAlbums.splice(albumIndex, 1);
		await this.updateAllAlbums(this.allAlbums);

		console.log(`[!] - Delete album success, has ${this.allAlbums.length} albums`);
	}

	async verifyAlbum(albumId: number, verifyType: string): Promise<any> {
		let message: string;

		try {
			console.log(`\n[!] Verify images of album: ${albumId}`);

			if (verifyType === "NSFW") {
				const listRacy: string[] = [];
				const listAdult: string[] = [];

				const album = this.allAlbums.find((album) => album.id === albumId);
				if (!album) {
					throw new Error(`Album not found: ${albumId}`);
				}

				const wallpapers = this.allWallpapers.filter((wallpaper) => album.wallpaperIds.includes(wallpaper.id));

				for (const wallpaper of wallpapers) {
					const { adult, racy } = await this.nsfwService.detectNsfw(wallpaper.preview_url);
					if (adult) listAdult.push(wallpaper.id);
					if (racy) listRacy.push(wallpaper.id);

					console.log(
						`[!] - Verify wallpaper: ${adult ? "ADULT" : racy ? "RACY" : "NORMAL"} | ${wallpaper.preview_url}`,
					);
				}

				console.log(`[!] - Result: ${listAdult.length} adults, ${listRacy.length} racy`);

				// Update albums data
				if (listRacy.length > 0 || listAdult.length > 0) {
					const newAllAlbums = this.allAlbums.map((album) => {
						if (album.id === albumId) {
							album.nsfw.adult = listAdult;
							album.nsfw.racy = listRacy;
						}
						return album;
					});
					await this.updateAllAlbums(newAllAlbums);
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
		await this.updateAllWallpapers(listExcluded);

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
				`[!] - Remove wallpaper has id '${wallpaperId}' (target: ${track_collection.targetId}) from album successfully.`,
			);
		} catch (error) {
			console.error(`[x] - Remove wallpaper has id ${wallpaperId} from album failed: ${error.message}`);
		}
	}
}
