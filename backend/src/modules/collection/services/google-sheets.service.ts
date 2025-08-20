import { Injectable } from "@nestjs/common";
import { google } from "googleapis";
import { config } from "#root/config";
import { ensureJSONFileAndWrite } from "#root/common/utils";
import { TrackCollectionDto } from "../dto";

@Injectable()
export class GoogleSheetsService {
	private sheets: any;

	constructor() {
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

			await ensureJSONFileAndWrite(config.FILE_PATH_LIST_TRACKING_COLL, trackCollections);

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
