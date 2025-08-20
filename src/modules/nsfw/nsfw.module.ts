import { NsfwVerificationService } from "#root/modules/nsfw/nsfw-verification.service";
import { Module } from "@nestjs/common";

@Module({
	imports: [],
	controllers: [],
	providers: [NsfwVerificationService],
	exports: [NsfwVerificationService],
})
export class NsfwModule {}
