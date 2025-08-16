class TrackCollection {
  
  constructor({
    collectionId,
    collectionStatus,
    collectionProvider,
    collectionTopic,
    collectionStyle,
    collectionType,
    collectionTargetId,
    collectionLink = null,
    itemsTotal = 0,
    created_at = Date.now(),
  }) {
    this.collectionProvider = collectionProvider;
    this.collectionId = collectionId;
    this.collectionTopic = collectionTopic;
    this.collectionStyle = collectionStyle;
    this.collectionLink = collectionLink;
    this.collectionType = collectionType;
    this.collectionTargetId = collectionTargetId;
    this.collectionStatus = collectionStatus;
    this.itemsTotal = itemsTotal;
    this.created_at = created_at;
  }
}

class Wallpaper {
  constructor({ 
    id, 
    model_id,
    prompt,
    local_prompt,
    banner,
    author_id,
    folder_no,
    obj_type,
    sub_obj_type,
    title,
    cover,
    tracking_type, 
    tracking_collection_id,
    status = true,
  }) {
    this.id = id;
    this.model_id = model_id;
    this.prompt = prompt;
    this.local_prompt = local_prompt;
    this.banner = banner;
    this.author_id = author_id;
    this.folder_no = folder_no;
    // More
    this.obj_type = obj_type;
    this.sub_obj_type = sub_obj_type;
    this.title = title;
    this.cover = cover;
    // Tracking-collection fields
    this.status = status;
    this.tracking_type = tracking_type;
    this.tracking_collection_id = tracking_collection_id;
  }
}

module.exports = { TrackCollection, Wallpaper };