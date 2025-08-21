import { Controller, Post } from "@nestjs/common";
import { CollectionService } from "./collection.service";
import { SyncCollectionsResponseDto } from "./dto";

@Controller()
export class CollectionController {
	constructor(private readonly collectionService: CollectionService) {}

	// Collection routes
	@Post("track-collections/sync")
	async syncCollections(): Promise<SyncCollectionsResponseDto> {
		return this.collectionService.syncCollections();
	}
}
