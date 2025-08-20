import { Injectable } from "@nestjs/common";
import { ImageAnnotatorClient } from "@google-cloud/vision";

export interface NsfwResult {
	adult: boolean;
	racy: boolean;
}

@Injectable()
export class NsfwVerificationService {
	private client: ImageAnnotatorClient;

	constructor() {
		// Initialize Google Vision client
		this.client = new ImageAnnotatorClient({
			keyFilename: "google-vision-credentials.json",
		});
	}

	async detectNsfw(imagePath: string): Promise<NsfwResult> {
		try {
			const [result] = await this.client.safeSearchDetection(imagePath);
			const detections = result.safeSearchAnnotation || {};

			// Thresholds to determine NSFW (UNKNOWN, VERY_UNLIKELY, UNLIKELY, POSSIBLE, LIKELY, VERY_LIKELY)
			return {
				adult: !(detections.adult === "UNLIKELY" || detections.adult === "VERY_UNLIKELY"),
				racy: !(detections.racy === "UNLIKELY" || detections.racy === "VERY_UNLIKELY"),
			};
		} catch (error) {
			console.error(`Error processing ${imagePath}:`, error);
			return { adult: false, racy: false };
		}
	}
}
