import { Module } from "@nestjs/common";
import { ProfileService } from "./profile.service";
import { ProfileController } from "./profile.controller";
import { PrismaModule } from "#root/modules/prisma/prisma.module";
import { CdnModule } from "#root/modules/cdn/cdn.module";
import { NsfwModule } from "#root/modules/nsfw/nsfw.module";

@Module({
	imports: [PrismaModule,  CdnModule, NsfwModule],
	controllers: [ProfileController],
	providers: [ProfileService],
	exports: [ProfileService],
})
export class ProfileModule {}
