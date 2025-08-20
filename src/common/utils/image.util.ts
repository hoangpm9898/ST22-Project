import * as sharp from "sharp";
import axios from "axios";
import * as fs from "fs/promises";
import * as path from "path";

export const cropImage = async (inputPath: string, outputPath: string): Promise<boolean> => {
	try {
		const image = sharp(inputPath);
		const metadata = await image.metadata();

		const targetRatio = 9 / 16;
		const currentRatio = metadata.width / metadata.height;

		let newWidth: number, newHeight: number;

		if (currentRatio > targetRatio) {
			newWidth = Math.floor(metadata.height * targetRatio);
			newHeight = metadata.height;
		} else {
			newWidth = metadata.width;
			newHeight = Math.floor(metadata.width / targetRatio);
		}

		await image
			.extract({
				left: Math.floor((metadata.width - newWidth) / 2),
				top: Math.floor((metadata.height - newHeight) / 2),
				width: newWidth,
				height: newHeight,
			})
			.toFile(outputPath);

		console.log(`[!] - The image has been cropped and saved in: ${outputPath}`);
		return true;
	} catch (error) {
		console.error("[x] - Error when cropping image:", error);
		return false;
	}
};

export const cropImageFromUrl = async (inputUrl: string, outputPath: string): Promise<boolean> => {
	try {
		// Fetch the image from the URL
		const response = await axios.get(inputUrl, { responseType: "arraybuffer" });
		const imageBuffer = Buffer.from(response.data);

		// Load the image into sharp from the buffer
		const image = sharp(imageBuffer);
		const metadata = await image.metadata();

		const targetRatio = 9 / 16;
		const currentRatio = metadata.width / metadata.height;

		let newWidth: number, newHeight: number;

		if (currentRatio > targetRatio) {
			newWidth = Math.floor(metadata.height * targetRatio);
			newHeight = metadata.height;
		} else {
			newWidth = metadata.width;
			newHeight = Math.floor(metadata.width / targetRatio);
		}

		await image
			.extract({
				left: Math.floor((metadata.width - newWidth) / 2),
				top: Math.floor((metadata.height - newHeight) / 2),
				width: newWidth,
				height: newHeight,
			})
			.toFile(outputPath);
		return true;
	} catch (error) {
		console.error("[x] - Error when cropping image:", error);
		return false;
	}
};

export const convertToWebp = async (inputPath: string, quality = 80): Promise<string | null> => {
	try {
		// Check if file exists
		await fs.access(inputPath);
		// Create output path for WEBP file
		const outputPath = path.join(
			path.dirname(inputPath),
			`${path.basename(inputPath, path.extname(inputPath))}.webp`,
		);
		// Convert to WEBP format
		await sharp(inputPath)
			.webp({ quality }) // (0-100)
			.toFile(outputPath);
		// Delete original file
		await fs.unlink(inputPath);
		return outputPath;
	} catch (error) {
		console.error("[x] - Error converting to WebP:", error);
		return null;
	}
};

// Get high quality image URL from provider
export const getHighImageUrl = async (provider: string, wallpaperId: string): Promise<string | null> => {
	try {
		if (provider === "seaart.ai") {
			const response = await fetch("https://www.seaart.ai/api/v1/artwork/detail", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: wallpaperId,
				}),
			});

			if (!response.ok) {
				throw new Error("Network response was not ok");
			}

			const result = await response.json();
			if (result?.data?.banner?.url) {
				console.log("[!] - Get high quality wallpaper successfully");
				return result.data.banner.url;
			}
		}
	} catch (error) {
		console.error("[x] - Error getting high quality image URL:", error);
	}
	return null;
};
