import { Injectable } from "@nestjs/common";
import { PrismaRepository } from "#root/modules/prisma/prisma.repository";
import axios from "axios";
import { delay } from "#root/common/utils";
import { TrackCollectionDto, WallpaperDto } from "../dto";

@Injectable()
export class SeaArtProviderService {
	private readonly host = "www.seaart.ai";

	constructor(private prisma: PrismaRepository) {}

	async fetchItemsByTag(collection: TrackCollectionDto): Promise<WallpaperDto[]> {
		let page = 1;
		let seaArtWorks: any[] = [];

		while (true) {
			const response = await axios.post(`https://${this.host}/api/v1/square/v3/artwork/list`, {
				page,
				page_size: 50,
				order_by: "week_hot",
				offset: "",
				tag_ids: [collection.collectionTargetId],
				tag: collection.collectionTargetId,
				sub_channel: [],
				base_models: [],
			});

			if (!response.data || response.data.status.msg !== "success") continue;

			const items = response.data.data.items.map((item: any) => ({
				id: item.id,
				modelId: collection.collectionTargetId,
				prompt: "",
				localPrompt: null,
				banner: {
					url: item.cover,
					width: 0,
					height: 0,
				},
				authorId: item.author.id,
				folderNo: "default",
				objType: item.obj_type,
				subObjType: item.sub_obj_type,
				title: item.sub_title,
				cover: item.cover,
				trackingType: "tag",
				trackingCollectionId: collection.collectionId,
				status: true,
			}));

			if (items && items.length > 0) {
				seaArtWorks = seaArtWorks.concat(items);
			}
			page++;
			if (!response.data.data.has_more) break;
		}

		if (seaArtWorks.length > 0) {
			// Save to database using Prisma
			await this.prisma.seaArtWork.createMany({
				data: seaArtWorks,
			});
		}

		// Convert to WallpaperDto format
		return seaArtWorks.map((work) => ({
			id: work.id,
			model_id: work.modelId,
			prompt: work.prompt,
			local_prompt: work.localPrompt,
			banner: work.banner,
			author_id: work.authorId,
			folder_no: work.folderNo,
			obj_type: work.objType,
			sub_obj_type: work.subObjType,
			title: work.title,
			cover: work.cover,
			tracking_type: work.trackingType,
			tracking_collection_id: work.trackingCollectionId,
			status: work.status,
		}));
	}

	async fetchItemsByModel(collection: TrackCollectionDto): Promise<WallpaperDto[]> {
		let page = 1;
		let seaArtWorks: any[] = [];

		while (true) {
			const response = await axios.post(`https://${this.host}/api/v1/square/v3/artwork/list`, {
				page,
				page_size: 50,
				order_by: "hot",
				artwork_types: [1, 3, 4, 6, 7],
				model_nos: collection.collectionTargetId,
				offset: "",
			});

			if (!response.data || response.data.status.msg !== "success") continue;

			const items = response.data.data.items.map((item: any) => ({
				id: item.id,
				modelId: collection.collectionTargetId,
				prompt: "",
				localPrompt: null,
				banner: {
					url: item.cover,
					width: 0,
					height: 0,
				},
				authorId: item.author.id,
				folderNo: "default",
				objType: item.obj_type,
				subObjType: item.sub_obj_type,
				title: item.sub_title,
				cover: item.cover,
				trackingType: "model",
				trackingCollectionId: collection.collectionId,
				status: true,
			}));

			if (items && items.length > 0) {
				seaArtWorks = seaArtWorks.concat(items);
			}
			page++;
			if (!response.data.data.has_more) break;
		}

		if (seaArtWorks.length > 0) {
			// Save to database using Prisma
			await this.prisma.seaArtWork.createMany({
				data: seaArtWorks,
			});
		}

		// Convert to WallpaperDto format
		return seaArtWorks.map((work) => ({
			id: work.id,
			model_id: work.modelId,
			prompt: work.prompt,
			local_prompt: work.localPrompt,
			banner: work.banner,
			author_id: work.authorId,
			folder_no: work.folderNo,
			obj_type: work.objType,
			sub_obj_type: work.subObjType,
			title: work.title,
			cover: work.cover,
			tracking_type: work.trackingType,
			tracking_collection_id: work.trackingCollectionId,
			status: work.status,
		}));
	}

	async fetchItemsByAccount(collection: TrackCollectionDto, accId?: string): Promise<number> {
		let page = 1;
		let wallpapers: WallpaperDto[] = [];

		const accountId = accId || collection.collectionTargetId;
		console.log(`\n[!] Fetch wallpapers from Account ID (${accountId})...`);

		try {
			let time_ms = 0;
			while (true) {
				console.log(`[!] - Fetch wallpapers for Account ID for page: ${page}`);
				try {
					const response = await axios.post(`https://${this.host}/api/v1/artwork/list`, {
						page,
						page_size: 35,
						type: "bookmarks",
						order_by: "hot",
						folder_no: "default",
						keyword: "",
						start_at: 0,
						end_at: 0,
						after: time_ms,
						time_to: time_ms !== 0 ? time_ms : undefined,
						artwork_types: [],
						account_no: accountId,
						category: 2,
					});

					if (!response.data || response.data.status.msg !== "success") continue;

					if (!response.data.data || response.data.data.items.length === 0) break;

					const items = response.data.data.items.map((item: any) => ({
						id: item.id,
						model_id: item.model_id,
						prompt: item.prompt,
						local_prompt: item.local_prompt,
						banner: item.banner,
						author_id: item.author.id || accountId,
						folder_no: item.folder_no.collection_id,
						obj_type: null,
						sub_obj_type: null,
						title: null,
						cover: null,
						tracking_type: "work",
						tracking_collection_id: collection.collectionId,
					}));

					if (items && items.length > 0) {
						console.log(
							`[!] - Fetch wallpapers for account ID (${accountId}) has: ${items.length} wallpapers`,
						);
						wallpapers = wallpapers.concat(items);
					}
					if (!response.data.data.has_more || items.length === 50) break;
					time_ms = response.data.data.time_ms;
					page++;
				} catch (error) {
					console.error(`[x] - Fetch wallpapers from Account ID for page ${page} fail: ${error.message}`);
				}
				await delay(1000);
			}

			if (wallpapers.length > 0) {
				// Convert to SeaArt work format for database storage
				const seaArtWorks = wallpapers.map((w) => ({
					id: w.id,
					modelId: w.model_id,
					prompt: w.prompt || "",
					localPrompt: w.local_prompt,
					banner: w.banner,
					authorId: w.author_id,
					folderNo: w.folder_no,
					objType: null,
					subObjType: null,
					title: null,
					cover: null,
					trackingType: "work",
					trackingCollectionId: collection.collectionId,
					status: true,
				}));

				// Save to database using Prisma
				await this.prisma.seaArtWork.createMany({
					data: seaArtWorks,
				});

				// Create account item records
				const accountItems = seaArtWorks.map((work) => ({
					seaArtWorkId: work.id,
				}));

				await this.prisma.accountItem.createMany({
					data: accountItems,
				});

				console.log(`[!] - Fetch wallpapers from Account ID success: ${wallpapers.length} wallpapers`);
			} else {
				console.error("[x] - Fetch wallpapers from Account collections fail: Empty wallpapers");
			}
		} catch (error) {
			console.error(`[x] - Fetch wallpapers from Account collections fail: ${error.message}`);
		}
		return wallpapers.length;
	}

	async fetchCollectionsByAccount(collection: TrackCollectionDto): Promise<number> {
		let wallpapersCount = 0;

		console.log(`\n[!] Fetch wallpapers from Account collections (${collection.collectionTargetId})...`);

		try {
			const response = await axios.post(`https://${this.host}/api/v1/account/collection`, {
				type: 1,
				other_id: collection.collectionTargetId, // Account ID
				category: 2,
			});

			if (!response.data || response.data.status.msg !== "success") {
				throw new Error("Invalid response from SeaArt.ai server");
			}

			const items = response.data.data.items;
			const cls = items.map((item: any) => {
				const artwork_items = item.artwork_items.map((work: any) => ({
					id: work.id,
					banner: work.banner.url,
					banner_width: work.banner.width,
					banner_height: work.banner.height,
				}));
				return {
					id: item.id,
					name: `${collection.collectionId}-${item.name}`,
					category: item.category,
					artwork_items: artwork_items,
					tracking_collection_id: collection.collectionId,
				};
			});

			if (cls && cls.length > 0) {
				// Save collections to database
				const seaArtCollections = cls.map((cl) => ({
					id: cl.id,
					name: cl.name,
					category: cl.category,
					trackingCollectionId: cl.tracking_collection_id,
				}));

				await this.prisma.seaArtCollection.createMany({
					data: seaArtCollections,
				});

				// Create collection items
				for (const cl of cls) {
					const collectionItems = cl.artwork_items.map((item) => ({
						id: item.id,
						banner: item.banner,
						bannerWidth: item.banner_width,
						bannerHeight: item.banner_height,
						collectionId: cl.id,
					}));

					await this.prisma.seaArtCollectionItem.createMany({
						data: collectionItems,
					});
				}

				// Fetch wallpapers...
				for (const cl of cls) {
					wallpapersCount += await this.fetchItemsByCollection(collection, cl.id);
					await delay(1000);
				}
				console.log(
					`[!] - Fetch wallpapers from Account collections success: ${cls.length} collections | ${wallpapersCount} wallpapers`,
				);
			} else {
				throw new Error("Empty collections");
			}
		} catch (error) {
			console.error(`[x] - Fetch wallpapers from Account collections fail: ${error.message}`);
		}
		return wallpapersCount;
	}

	private async fetchItemsByCollection(collection: TrackCollectionDto, collectionId: string): Promise<number> {
		let page = 1;
		let wallpapers: WallpaperDto[] = [];

		const accountId = collection.collectionTargetId;

		let time_ms = 0;
		while (true) {
			try {
				const response = await axios.post(`https://${this.host}/api/v1/artwork/list/other`, {
					page,
					page_size: 60,
					type: "bookmarks",
					folder_no: collectionId,
					keyword: "",
					start_at: 0,
					end_at: 0,
					after: time_ms,
					time_to: time_ms !== 0 ? time_ms : undefined,
					artwork_types: [],
					account_no: accountId,
					category: 2,
				});
				if (!response.data || response.data.status.msg !== "success") continue;

				const items = response.data.data.items;

				if (!items) {
					page--;
					break;
				}

				const itms = items.map((item: any) => ({
					id: item.id,
					model_id: item.model_id,
					prompt: item.prompt,
					local_prompt: item.local_prompt,
					banner: item.banner,
					author_id: item.author.id || accountId,
					folder_no: item.folder_no.collection_id,
					obj_type: null,
					sub_obj_type: null,
					title: null,
					cover: null,
					tracking_type: "collection",
					tracking_collection_id: collection.collectionId,
				}));

				if (itms && itms.length > 0) {
					wallpapers = wallpapers.concat(itms);
				}
				if (!response.data.data.has_more || itms.length === 50) break;
				time_ms = response.data.data.time_ms;
				page++;
			} catch (error) {
				// Continue on error
			}
		}

		if (wallpapers.length > 0) {
			console.log(
				`[!] - Fetch wallpapers for account-collection (${collectionId}) success (with ${page} pages): ${wallpapers.length} wallpapers`,
			);

			// Convert to SeaArt work format for database storage
			const seaArtWorks = wallpapers.map((w) => ({
				id: w.id,
				modelId: w.model_id,
				prompt: w.prompt || "",
				localPrompt: w.local_prompt,
				banner: w.banner,
				authorId: w.author_id,
				folderNo: w.folder_no,
				objType: null,
				subObjType: null,
				title: null,
				cover: null,
				trackingType: "collection",
				trackingCollectionId: collection.collectionId,
				status: true,
			}));

			// Save to database using Prisma
			await this.prisma.seaArtWork.createMany({
				data: seaArtWorks,
			});

			// Create account item records
			const accountItems = seaArtWorks.map((work) => ({
				seaArtWorkId: work.id,
			}));

			await this.prisma.accountItem.createMany({
				data: accountItems,
			});
		}
		return wallpapers.length;
	}
}
