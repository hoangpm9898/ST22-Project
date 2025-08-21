import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "#root/modules/app/app.controller";
import { AppService } from "#root/modules/app/app.service";
import { CacheModule } from "@nestjs/cache-manager";
import { config } from "#root/config";
import * as redisStore from "cache-manager-redis-store";
import { BullModule } from "@nestjs/bull";
import { PrismaModule } from "#root/modules/prisma/prisma.module";
import { AlbumModule } from "#root/modules/album/album.module";
import { CollectionModule } from "#root/modules/collection/collection.module";
import { ProfileModule } from "#root/modules/profile/profile.module";
import { ManagementModule } from "#root/modules/management/management.module";
import { QueueModule } from "#root/modules/queue/queue.module";

@Module({
	imports: [
		ScheduleModule.forRoot(),
		CacheModule.register({
			isGlobal: true,
			useFactory: async () => ({
				store: redisStore,
				host: config.REDIS_HOST,
				port: config.REDIS_PORT,
				password: config.REDIS_PASSWORD,
				ttl: 300,
			}),
		}),
		BullModule.forRoot({
			redis: {
				host: config.REDIS_HOST,
				port: config.REDIS_PORT,
				password: config.REDIS_PASSWORD,
			},
		}),
		BullModule.registerQueue({
			name: "collection-queue",
		}),
		PrismaModule,
		AlbumModule,
		CollectionModule,
		ProfileModule,
		ManagementModule,
		QueueModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
