import { Module } from "@nestjs/common";
import { ProfileService } from "./profile.service";
import { ProfileController } from "./profile.controller";
import { PrismaModule } from "#root/modules/prisma/prisma.module";
import { CdnService, NsfwVerificationService } from "#root/common/services";

@Module({
	imports: [PrismaModule],
	controllers: [ProfileController],
	providers: [ProfileService, CdnService, NsfwVerificationService],
	exports: [ProfileService],
})
export class ProfileModule {}
