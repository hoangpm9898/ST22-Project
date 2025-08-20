import { Module } from "@nestjs/common";
import { AlbumService } from "./album.service";
import { AlbumController } from "./album.controller";
import { PrismaModule } from "#root/modules/prisma/prisma.module";
import { CdnService, NsfwVerificationService } from "#root/common/services";

@Module({
	imports: [PrismaModule],
	controllers: [AlbumController],
	providers: [AlbumService, CdnService, NsfwVerificationService],
	exports: [AlbumService],
})
export class AlbumModule {}
