import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { GoogleSheetsService } from "./services/google-sheets.service";
import { SeaArtProviderService } from "./services/seaart-provider.service";
import { TrackCollectionDto, SyncCollectionsResponseDto } from "./dto";

@Injectable()
export class CollectionService {
	constructor(
		private googleSheetsService: GoogleSheetsService,
		private seaArtProviderService: SeaArtProviderService,
		@InjectQueue("collection-queue") private collectionQueue: Queue,
	) {}

	async syncCollections(): Promise<SyncCollectionsResponseDto> {
		// Fetch track-collections...
		const collections = await this.googleSheetsService.fetchTracks();

		if (!collections || collections.length === 0) {
			throw new Error("No collections found");
		}
		console.log(`\n[!] We have ${collections.length} collections!!!`);

		let readyCount = 0;
		for (const collection of collections) {
			// Load ready track collections
			if (["ready", "fail", "error"].includes(collection.collectionStatus)) {
				// Push to Queue...
				await this.queueCollectionForProcessing(collection);
				readyCount += 1;
			}
		}

		return {
			message: `Has ${readyCount} ready collections synced and queued for processing`,
		};
	}

	async queueCollectionForProcessing(collection: TrackCollectionDto): Promise<void> {
		await this.collectionQueue.add("process-collection", collection);
	}

	async fetchDataFromProvider(collection: TrackCollectionDto): Promise<number> {
		let itemsCount = 0;

		if (collection && collection.collectionProvider === "seaart.ai") {
			switch (collection.collectionType) {
				case "Tag":
					const tagItems = await this.seaArtProviderService.fetchItemsByTag(collection);
					itemsCount = tagItems.length;
					break;
				case "Model":
					const modelItems = await this.seaArtProviderService.fetchItemsByModel(collection);
					itemsCount = modelItems.length;
					break;
				case "User_Work":
					itemsCount = await this.seaArtProviderService.fetchItemsByAccount(collection);
					break;
				case "User_Collection":
					itemsCount = await this.seaArtProviderService.fetchCollectionsByAccount(collection);
					break;
				default:
					break;
			}
		}
		return itemsCount;
	}
}
