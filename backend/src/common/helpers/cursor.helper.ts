import { Meta } from "#root/common/types";

export class CursorHelper {
	static encodeCursor(data: any): string {
		return Buffer.from(JSON.stringify(data)).toString("base64");
	}

	static decodeCursor(cursor: string): any {
		try {
			const decoded = Buffer.from(cursor, "base64").toString();
			return JSON.parse(decoded);
		} catch (error) {
			return null;
		}
	}

	static createPaginationMeta(offset: number, limit: number, total: number): Meta {
		const hasNext = offset + limit < total;
		const nextCursor = hasNext ? this.encodeCursor({ offset: offset + limit }) : null;

		return {
			has_next: hasNext,
			next_cursor: nextCursor,
			limit,
			total_records: total,
			current_offset: offset,
		};
	}
}
