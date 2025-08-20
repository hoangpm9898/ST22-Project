import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { CollectionService } from "./collection.service";
import { CollectionController } from "./collection.controller";
import { GoogleSheetsService } from "./services/google-sheets.service";
import { SeaArtProviderService } from "./services/seaart-provider.service";

@Module({
	imports: [
		BullModule.registerQueue({
			name: "collection-queue",
		}),
	],
	controllers: [CollectionController],
	providers: [CollectionService, GoogleSheetsService, SeaArtProviderService],
	exports: [CollectionService],
})
export class CollectionModule {}
