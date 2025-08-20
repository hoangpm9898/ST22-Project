import { Global, Module } from "@nestjs/common";
import { PrismaRepository } from "./prisma.repository";

@Global()
@Module({
	providers: [PrismaRepository],
	exports: [PrismaRepository],
})
export class PrismaModule {}
