
class ProfileWallpaper {
  constructor({ 
    profileId, id, name, url, preview_url,
    model_id, author_id, folder_no, tracking_type, tracking_collection_id
  }) {
    this.id = id;
    this.name = name;
    this.url = url;
    this.preview_url = preview_url;
    this.profileId = profileId;
    //
    this.model_id = model_id;
    this.author_id = author_id;
    this.folder_no = folder_no;
    this.tracking_type = tracking_type;
    this.tracking_collection_id = tracking_collection_id;
  }
}

class Profile {
  constructor({ 
    id, 
    name, 
    thumb, 
    avatarPath, 
    backgoundPath, 
    wallpaperIds = [], 
    nsfw = {adult:[],racy:[]}
  }) {
    this.id = id;
    this.name = name;
    this.thumb = thumb;
    this.avatarPath = avatarPath;
    this.backgoundPath = backgoundPath;
    this.wallpaperIds = wallpaperIds;
    this.nsfw = nsfw;
  }
}

module.exports = { Profile, ProfileWallpaper };