import { Injectable, OnModuleInit } from "@nestjs/common";
import { readJSONFile, getRandomElement } from "#root/common/utils";
import { config } from "#root/config";
import { ApiResponseDto, PaginationResponseDto } from "#root/common/dto";
import {
	AppCategoryDto,
	AppTagDto,
	AppAlbumDto,
	AppTagActiveDto,
	GetAlbumsByCategoryDto,
	GetAlbumsByTagDto,
} from "./dto";
import axios from "axios";

@Injectable()
export class AppService implements OnModuleInit {
	private allAppCategories: AppCategoryDto[] = [];
	private allAppTags: AppTagDto[] = [];
	private allAppAlbums: AppAlbumDto[] = [];

	async onModuleInit() {
		await this.loadAllAppData();
	}

	private async loadAllAppData() {
		await Promise.all([this.loadAppCategories(), this.loadAppTags(), this.loadAppAlbums()]);
	}

	private async loadAppCategories() {
		this.allAppCategories = await readJSONFile<AppCategoryDto>(`${config.APP_RESULTS_PATH}/categories.json`);
		console.log(`\n[!] Loaded ${this.allAppCategories.length} categories initially for App`);
	}

	private async loadAppTags() {
		this.allAppTags = await readJSONFile<AppTagDto>(`${config.APP_RESULTS_PATH}/tags.json`);
		console.log(`\n[!] Loaded ${this.allAppTags.length} tags initially for App`);
	}

	private async loadAppAlbums() {
		this.allAppAlbums = await readJSONFile<AppAlbumDto>(`${config.APP_RESULTS_PATH}/albums.json`);
		console.log(`\n[!] Loaded ${this.allAppAlbums.length} albums initially for App`);
	}

	async getAppCategories(): Promise<AppCategoryDto[]> {
		console.log(`\n[!] Get all categories`);
		const categories: AppCategoryDto[] = [];

		for (const category of this.allAppCategories) {
			if (category.id === config.CTG_FORYOU_ID || (await this.getAppAlbumsByCategoryID(category.id)).length > 0) {
				categories.push(category);
			}
		}

		console.log(`[!] - Get all categories success, has ${categories.length} categories`);
		return categories;
	}

	async getAppTags(): Promise<AppTagDto[]> {
		console.log(`\n[!] Get all tags`);
		const tags: AppTagDto[] = [];

		for (const tag of this.allAppTags) {
			if ((await this.getAppAlbumsByTagID(tag.id)).length > 0) {
				tags.push(tag);
			}
		}

		console.log(`[!] - Get all tags success, has ${tags.length} tags`);
		return tags;
	}

	async getAppTagsActive(): Promise<AppTagActiveDto[]> {
		const info: AppTagActiveDto[] = [];

		for (const tag of this.allAppTags) {
			const totalAlbums = (await this.getAppAlbumsByTagID(tag.id)).length;
			if (totalAlbums > 0) {
				info.push({ name: tag.name, total: totalAlbums });
			}
		}

		return info;
	}

	async getSingleAlbum(): Promise<AppAlbumDto> {
		return getRandomElement(this.allAppAlbums);
	}

	async getAppAlbumsByCategory(
		getAlbumsByCategoryDto: GetAlbumsByCategoryDto,
	): Promise<ApiResponseDto<AppAlbumDto[]>> {
		const { categoryId, page = 1, limit = 20 } = getAlbumsByCategoryDto;

		console.log(`\n[!] Get list albums by category: ${categoryId}`);

		let albums: AppAlbumDto[];
		if (Number(categoryId) === Number(config.CTG_FORYOU_ID)) {
			albums = await this.getAppAlbumsByCategoryID(categoryId, true);
		} else {
			albums = await this.getAppAlbumsByCategoryID(categoryId);
		}

		console.log(`[!] - Get list albums by category success, has ${albums.length} albums`);

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

		console.log(`\n[!] Get list albums by tag: ${tagId}`);

		const albums = await this.getAppAlbumsByTagID(tagId);

		console.log(`[!] - Get list albums by tag success, has ${albums.length} albums`);

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
		if (getAllAlbums) {
			return this.allAppAlbums;
		}
		return this.allAppAlbums.filter((album) => album.categoryId === Number(categoryId));
	}

	private async getAppAlbumsByTagID(tagId: number): Promise<AppAlbumDto[]> {
		const tagName = this.allAppTags.find((tag) => tag.id === Number(tagId))?.name;
		if (!tagName) return [];
		return this.allAppAlbums.filter((album) => album.tags.includes(tagName));
	}

	async verifyInvalidLinks(typeVerify: string): Promise<any[]> {
		console.debug("\n[!] Starting verification for all items...");

		let jsonData: any[];
		let invalidLinks: any[];

		try {
			if (typeVerify === "albums") {
				jsonData = await readJSONFile(`${config.APP_RESULTS_PATH}/albums.json`);
				invalidLinks = await this.checkAlbumUrls(jsonData);
			} else if (typeVerify === "tags") {
				jsonData = await readJSONFile(`${config.APP_RESULTS_PATH}/tags.json`);
				invalidLinks = await this.checkTagUrls(jsonData);
			}

			return invalidLinks || [];
		} catch (error) {
			console.error("\n[x] Error:", error.message);
			return [];
		}
	}

	private async verifyUrl(url: string): Promise<boolean> {
		console.debug(`Checking URL: ${url}`);
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
			console.debug(`\n[!] - Checking album ID: ${album.id} (${album.name})`);

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
					console.debug(`[!] - Invalid thumb URL: ${album.thumb_url}`);
				}
			}

			if (album.photos_url) {
				for (const url of album.photos_url) {
					if (!(await this.verifyUrl(url))) {
						invalidAlbum.photo_error_links.push(url);
						hasError = true;
						console.debug(`[!] - Invalid photo URL: ${url}`);
					}
				}
			}

			if (hasError) {
				invalidAlbums.push(invalidAlbum);
			}
		}

		console.debug(`\n[!] Finished URL checks: ${invalidAlbums.length} invalid albums`);
		return invalidAlbums;
	}

	private async checkTagUrls(tags: any[]): Promise<any[]> {
		const invalidTags: any[] = [];

		for (const tag of tags) {
			console.debug(`\n[!] Checking tag ID: ${tag.id} (${tag.name})`);

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
					console.debug(`[!] - Invalid URL: ${tag.thumb}`);
				}
			}

			if (hasError) {
				invalidTags.push(invalidTag);
			}
		}

		console.debug(`\n[!] Finished URL checks: ${invalidTags.length} invalid tags`);
		return invalidTags;
	}
}
