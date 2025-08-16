
class Category {
  constructor({ id, name, thumb }) {
    this.id = id;
    this.name = name;
    this.thumb = thumb;
  }
}

class AlbumWallpaper {
  constructor({ 
    albumId, id, name, url, preview_url,
    model_id, author_id, folder_no, tracking_type, tracking_collection_id
  }) {
    this.id = id;
    this.name = name;
    this.url = url;
    this.preview_url = preview_url;
    this.albumId = albumId;
    //
    this.model_id = model_id;
    this.author_id = author_id;
    this.folder_no = folder_no;
    this.tracking_type = tracking_type;
    this.tracking_collection_id = tracking_collection_id;
  }
}

class Album {
  constructor({ id, name, thumb, categoryId, tags=[], countries=[], wallpaperIds=[], nsfw={adult:[],racy:[]}, mapStatus=false }) {
    this.id = id;
    this.name = name;
    this.thumb = thumb;
    this.categoryId = categoryId;
    this.tags = tags;
    this.countries = countries;
    this.wallpaperIds = wallpaperIds;
    this.nsfw = nsfw;
    this.mapStatus = mapStatus;
  }
}

class AlbumJSON {
  constructor({ id, code, name, category, required_ad_cnt=0, thumb_url, photos_url=[]}) {
    this.id = id;
    this.code = code;
    this.name = name;
    this.category = category;
    this.required_ad_cnt = required_ad_cnt;
    this.thumb_url = thumb_url;
    this.photos_url = photos_url;
  }
}

module.exports = { Category, AlbumWallpaper, Album, AlbumJSON };