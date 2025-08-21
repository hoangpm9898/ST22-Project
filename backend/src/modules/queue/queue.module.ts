import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { CollectionModule } from "#root/modules/collection/collection.module";
import { ManagementModule } from "#root/modules/management/management.module";
import { AlbumModule } from "#root/modules/album/album.module";
import { ProfileModule } from "#root/modules/profile/profile.module";
import { CollectionQueueProcessor } from "#root/modules/queue/collection-queue.processor";

@Module({
	imports: [
		BullModule.registerQueue({
			name: "collection-queue",
		}),
		CollectionModule,
		ManagementModule,
		AlbumModule,
		ProfileModule,
	],
	providers: [CollectionQueueProcessor],
})
export class QueueModule {}
