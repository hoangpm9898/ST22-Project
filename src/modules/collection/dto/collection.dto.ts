export class TrackCollectionDto {
	collectionId: number;
	collectionStatus: string;
	collectionProvider: string;
	collectionTopic: string;
	collectionStyle: string;
	collectionType: string;
	collectionTargetId: string;
	collectionLink?: string;
	itemsTotal?: number;
	created_at?: number;
}

export class WallpaperDto {
	id: string;
	model_id: string;
	prompt?: string;
	local_prompt?: string;
	banner: any;
	author_id: string;
	folder_no: string;
	obj_type?: string;
	sub_obj_type?: string;
	title?: string;
	cover?: string;
	tracking_type: string;
	tracking_collection_id: number;
	status?: boolean = true;
}

export class SyncCollectionsResponseDto {
	message: string;
}
