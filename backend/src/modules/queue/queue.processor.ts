import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable } from "@nestjs/common";
import { CollectionService } from "#root/modules/collection/collection.service";
import { ManagementService } from "#root/modules/management/management.service";
import { readJSONFile, ensureJSONFileAndWrite } from "#root/common/utils";
import { config } from "#root/config";

@Processor("collection-queue")
@Injectable()
export class CollectionQueueProcessor {
	constructor(
		private collectionService: CollectionService,
		private managementService: ManagementService,
	) {}

	@Process("process-collection")
	async handleCollectionProcessing(job: Job): Promise<void> {
		const collection = job.data;

		try {
			console.log(
				`\n[!] Tracking <${collection.collectionProvider}> collection (${collection.collectionId}) starting...`,
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
			console.log(
				`\n[x] Tracking <${collection.collectionProvider}> collection (${collection.collectionId}) failed: ${error.message}`,
			);
		}

		// Update for sheet... (This would need Google Sheets service integration)
		// await updateTrack(collection.collectionId, collection.collectionStatus);

		// Update this collection metadata
		const collections = await readJSONFile(config.FILE_PATH_LIST_TRACKING_COLL);
		const updatedCollections = collections.map((c: any) =>
			c.collectionTargetId === collection.collectionTargetId && c.collectionId === collection.collectionId
				? collection
				: c,
		);
		await ensureJSONFileAndWrite(config.FILE_PATH_LIST_TRACKING_COLL, updatedCollections);

		console.log(
			`\n[!] Tracking <${collection.collectionProvider}> collection (${collection.collectionId}) completed !!!`,
		);

		// Get new track-collections...
		await this.managementService.updateTrackingCollections();
	}
}
