import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Param,
	Body,
	Query,
	ParseIntPipe,
	UseInterceptors,
	UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ProfileService } from "./profile.service";
import { CreateProfileDto, UpdateProfileDto, UpdateProfileDetailDto, VerifyProfileDto } from "./dto";

@Controller()
export class ProfileController {
	constructor(private readonly profileService: ProfileService) {}

	// Profile routes
	@Get("profiles")
	async listProfiles() {
		return this.profileService.listProfiles();
	}

	@Get("profiles/:profileId")
	async getProfile(@Param("profileId", ParseIntPipe) profileId: number) {
		return this.profileService.getProfile(profileId);
	}

	@Get("profiles/:profileId/images")
	async getProfileImages(@Param("profileId", ParseIntPipe) profileId: number, @Query("full") full?: string) {
		const getFullFields = full === "true";
		return this.profileService.getImagesByProfileId(profileId, getFullFields, false);
	}

	@Post("profiles")
	async createProfile(@Body() createProfileDto: CreateProfileDto) {
		return this.profileService.createProfile(createProfileDto);
	}

	@Post("profiles/:typeHandler")
	async updateProfile(@Param("typeHandler") typeHandler: string, @Body() updateProfileDto: UpdateProfileDto) {
		return this.profileService.updateProfile(typeHandler, updateProfileDto);
	}

	@Put("profiles/:profileId")
	async updateProfileDetail(
		@Param("profileId", ParseIntPipe) profileId: number,
		@Body() updateProfileDetailDto: UpdateProfileDetailDto,
	) {
		return this.profileService.updateProfileDetail(profileId, updateProfileDetailDto);
	}

	@Delete("profiles/:profileId")
	async deleteProfile(@Param("profileId", ParseIntPipe) profileId: number) {
		await this.profileService.deleteProfile(profileId);
		return { message: "Profile deleted successfully" };
	}

	// Profile routes (more)
	@Get("profile/info")
	async getProfilesInfo() {
		return this.profileService.getProfilesInfo();
	}

	@Get("profile/verify")
	async verifyProfile(@Query() verifyProfileDto: VerifyProfileDto) {
		const profileId = parseInt(verifyProfileDto.profileId);
		return this.profileService.verifyProfile(profileId, "NSFW");
	}

	// Upload avatar & background of profile
	@Post("profile/upload-image")
	@UseInterceptors(FileInterceptor("image"))
	async uploadImageFile(
		@Query("profileId", ParseIntPipe) profileId: number,
		@Query("fileType") fileType: string,
		@UploadedFile() file: Express.Multer.File,
	) {
		if (!file) {
			return { success: false, message: "No file uploaded" };
		}
		const filePath = await this.profileService.uploadImageFile(profileId, fileType, file);
		return { success: true, filePath, message: "Upload has successfully" };
	}
}
