import { Controller, Post } from "@nestjs/common";
import { CollectionService } from "./collection.service";
import { SyncCollectionsResponseDto } from "./dto";

@Controller("track-collections")
export class CollectionController {
	constructor(private readonly collectionService: CollectionService) {}

	@Post("sync")
	async syncCollections(): Promise<SyncCollectionsResponseDto> {
		return this.collectionService.syncCollections();
	}
}
