import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { CollectionQueueProcessor } from "./queue.processor";
import { CollectionModule } from "#root/modules/collection/collection.module";
import { ManagementModule } from "#root/modules/management/management.module";

@Module({
	imports: [
		BullModule.registerQueue({
			name: "collection-queue",
		}),
		CollectionModule,
		ManagementModule,
	],
	providers: [CollectionQueueProcessor],
})
export class QueueModule {}
