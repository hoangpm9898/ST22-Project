import { UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { randomUUID } from "crypto";
import * as path from "path";
import * as fs from "fs";
import { extname } from "path";

interface UploadOptions {
	path: string;
	allowedExt: string[];
	maxSizeMB: number;
}

function UploadFileInterceptor(options: UploadOptions) {
	return UseInterceptors(
		FileInterceptor("file", {
			storage: diskStorage({
				destination: (req, file, cb) => {
					const jobId = randomUUID();
					(req as any).jobId = jobId;
					const dir = path.join(options.path, jobId);
					fs.mkdirSync(dir, { recursive: true });
					cb(null, dir);
				},
				filename: (req, file, cb) => {
					const name = "file" + extname(file.originalname);
					cb(null, name);
				},
			}),
			fileFilter: (req, file, cb) => {
				const ext = extname(file.originalname).toLowerCase();
				if (!options.allowedExt.includes(ext)) {
					return cb(new Error(`Invalid file type: ${ext}`), false);
				}
				cb(null, true);
			},
			limits: {
				fileSize: options.maxSizeMB * 1024 * 1024,
			},
		}),
	);
}

export default { UploadFileInterceptor };
