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
import {
	CreateProfileDto,
	UpdateProfileDto,
	UpdateProfileDetailDto,
	VerifyProfileDto,
	HandleProfileResultsDto,
} from "./dto";

@Controller("profiles")
export class ProfileController {
	constructor(private readonly profileService: ProfileService) {}

	@Get("info")
	async getProfilesInfo() {
		return this.profileService.getProfilesInfo();
	}

	@Get(":profileId")
	async getProfile(@Param("profileId", ParseIntPipe) profileId: number) {
		return this.profileService.getProfile(profileId);
	}

	@Get(":profileId/images")
	async getProfileImages(@Param("profileId", ParseIntPipe) profileId: number, @Query("full") full?: string) {
		const getFullFields = full === "true";
		return this.profileService.getImagesByProfileId(profileId, getFullFields, false);
	}

	@Get()
	async listProfiles() {
		return this.profileService.listProfiles();
	}

	@Post()
	async createProfile(@Body() createProfileDto: CreateProfileDto) {
		return this.profileService.createProfile(createProfileDto);
	}

	@Post(":typeHandler")
	async updateProfile(@Param("typeHandler") typeHandler: string, @Body() updateProfileDto: UpdateProfileDto) {
		return { message: "Update profile endpoint - to be implemented" };
	}

	@Put(":profileId")
	async updateProfileDetail(
		@Param("profileId", ParseIntPipe) profileId: number,
		@Body() updateProfileDetailDto: UpdateProfileDetailDto,
	) {
		// Implementation will be added in the next update
		return { message: "Update profile detail endpoint - to be implemented" };
	}

	@Delete(":profileId")
	async deleteProfile(@Param("profileId", ParseIntPipe) profileId: number) {
		await this.profileService.deleteProfile(profileId);
		return { message: "Profile deleted successfully" };
	}

	@Get("verify")
	async verifyProfile(@Query() verifyProfileDto: VerifyProfileDto) {
		const profileId = parseInt(verifyProfileDto.profileId);
		return this.profileService.verifyProfile(profileId, "NSFW");
	}

	@Post("upload-image")
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

	// Background processing endpoints
	@Post("results")
	async handleProfilesResult(@Body() handleProfileResultsDto: HandleProfileResultsDto) {
		// Implementation will be added when we create the queue service
		return { message: "Profiles has generating..." };
	}
}
