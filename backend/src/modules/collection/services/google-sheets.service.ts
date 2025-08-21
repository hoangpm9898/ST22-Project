import { Injectable } from "@nestjs/common";
import { PrismaRepository } from "#root/modules/prisma/prisma.repository";
import { google } from "googleapis";
import { config } from "#root/config";
import { TrackCollectionDto } from "../dto";

@Injectable()
export class GoogleSheetsService {
	private sheets: any;

	constructor(private prisma: PrismaRepository) {
		const auth = new google.auth.GoogleAuth({
			keyFile: "api-projects-461703-ecb31530fbc7.json",
			scopes: ["https://www.googleapis.com/auth/spreadsheets"],
		});

		this.sheets = google.sheets({
			version: "v4",
			auth,
		});
	}

	async fetchTracks(): Promise<TrackCollectionDto[]> {
		try {
			const response = await this.sheets.spreadsheets.values.get({
				spreadsheetId: config.GOOGLE_SHEET_ID,
				range: `${config.GOOGLE_SHEET_NAME}!A1:J`,
			});

			const rows = response.data.values;
			const collections = rows.slice(1).map((row: any[]) => ({
				collectionId: parseInt(row[0]),
				collectionStatus: row[1],
				collectionProvider: row[2],
				collectionTopic: row[3],
				collectionStyle: row[4],
				collectionType: row[5],
				collectionTargetId: row[6],
			}));

			const trackCollections: TrackCollectionDto[] = collections.map((c: any) => ({
				collectionId: c.collectionId,
				collectionStatus: c.collectionStatus,
				collectionProvider: c.collectionProvider,
				collectionTopic: c.collectionTopic,
				collectionStyle: c.collectionStyle,
				collectionType: c.collectionType,
				collectionTargetId: c.collectionTargetId,
			}));

			// Save to database using Prisma
			const trackingCollectionData = trackCollections.map((tc) => ({
				collectionId: tc.collectionId,
				collectionStatus: tc.collectionStatus,
				collectionProvider: tc.collectionProvider,
				collectionTopic: tc.collectionTopic,
				collectionStyle: tc.collectionStyle,
				collectionType: tc.collectionType,
				collectionTargetId: tc.collectionTargetId,
				collectionLink: tc.collectionLink,
				itemsTotal: tc.itemsTotal || 0,
				createdAt: BigInt(Date.now()),
			}));

			// Upsert tracking collections (update if exists, create if not)
			for (const tcData of trackingCollectionData) {
				await this.prisma.trackingCollection.upsert({
					where: {
						collectionId: tcData.collectionId,
					},
					update: {
						collectionStatus: tcData.collectionStatus,
						collectionProvider: tcData.collectionProvider,
						collectionTopic: tcData.collectionTopic,
						collectionStyle: tcData.collectionStyle,
						collectionType: tcData.collectionType,
						collectionTargetId: tcData.collectionTargetId,
					},
					create: tcData,
				});
			}

			return trackCollections;
		} catch (error) {
			console.error("\n[x] Error fetch list track collections:", error);
			return [];
		}
	}

	async updateTrack(collectionId: number, status: string): Promise<void> {
		try {
			// Calculate row index in sheet (collection.id + 1 because index starts from A2)
			const sheetRowIndex = parseInt(collectionId.toString()) + 1;

			// Update value in column B of corresponding row
			await this.sheets.spreadsheets.values.update({
				spreadsheetId: config.GOOGLE_SHEET_ID,
				range: `${config.GOOGLE_SHEET_NAME}!B${sheetRowIndex}`,
				valueInputOption: "RAW",
				resource: {
					values: [[status]],
				},
			});
			console.log(`[!] Updating track collection [${collectionId}] success: ${status}`);
		} catch (error) {
			console.error("[x] Error updating track collection:", error);
		}
	}
}
