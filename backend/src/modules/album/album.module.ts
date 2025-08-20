import { Module } from "@nestjs/common";
import { AlbumService } from "./album.service";
import { AlbumController } from "./album.controller";
import { PrismaModule } from "#root/modules/prisma/prisma.module";
import { CdnModule } from "#root/modules/cdn/cdn.module";
import { NsfwModule } from "#root/modules/nsfw/nsfw.module";

@Module({
	imports: [PrismaModule, CdnModule, NsfwModule],
	controllers: [AlbumController],
	providers: [AlbumService],
	exports: [AlbumService],
})
export class AlbumModule {}
