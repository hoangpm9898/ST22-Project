import { CdnService } from "#root/modules/cdn/cdn.service";
import { Module } from "@nestjs/common";

@Module({
	imports: [],
	controllers: [],
	providers: [CdnService],
	exports: [CdnService],
})
export class CdnModule {}
