import { Injectable } from "@nestjs/common";
import { Client } from "basic-ftp";
import { Readable } from "stream";
import * as fs from "fs";
import { config } from "#root/config";

export interface UploadResult {
	success: boolean;
	url?: string;
	message?: string;
}

@Injectable()
export class CdnService {
	async uploadToCdn(filePath: string | Buffer, destination: string): Promise<UploadResult> {
		const client = new Client();
		client.ftp.verbose = false;

		// Create public URL to access file
		const publicUrl = `https://${config.BUNNY_CDN_ACCESS}/${destination}`;

		try {
			// Connect to Bunny CDN via FTP
			await client.access({
				host: config.BUNNY_CDN_HOST,
				port: 21,
				user: config.BUNNY_CDN_USERNAME,
				password: config.BUNNY_CDN_PASSWD,
				secure: true,
			});

			// Create readStream from filePath
			let readStream: Readable;

			if (typeof filePath === "string") {
				try {
					await fs.promises.access(filePath, fs.constants.F_OK);
				} catch {
					throw new Error(`File not found: ${filePath}`);
				}
				readStream = fs.createReadStream(filePath);
			} else {
				// Convert Buffer to Readable stream
				readStream = Readable.from(filePath);
			}

			// Upload file to Bunny CDN
			await client.uploadFrom(readStream, destination);

			return { success: true, url: publicUrl };
		} catch (error) {
			return {
				success: false,
				message: `Failed to upload to CDN (${publicUrl}): ${error.message}`,
			};
		} finally {
			client.close(); // Close FTP connection
		}
	}
}
