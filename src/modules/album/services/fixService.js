const path = require('path');
const fs = require('fs').promises;

const { getAllAppAlbums } = require("../../app/repositories/appRepositories");
const { getImagesByAlbumId } = require('./albumService');
const { cropImageLink } = require('../../../utils/commonUtil');
const { uploadCDN } = require('./cdnService');

const pushMissWallpapers = async (resource, albumId, wallpaperIds) => {
  try {
    console.log(`\n[!] Push ${wallpaperIds.length} wallpapers of album [${albumId}] again...`);

    const ALL_ALBUMS = await getAllAppAlbums();

    // Get idx of target album...
    const albumIndex = ALL_ALBUMS.findIndex(album => album.id === Number(albumId));
    if (albumIndex === -1) {
      throw new Error(`Album not found!`);
    }
    
    // Get target album by idx...
    const album = ALL_ALBUMS[albumIndex];
    console.log(`[!] - Find album success: ${album.name}`);

    // Create album folder (data/albums/results) if not exists...
    const album_dir_path = path.join(process.env.RESULTS_PATH, album.id.toString());

    // Get wallpapers of target album...
    const wallpapers = await getImagesByAlbumId(album.id, true, undefined);
    // Download & Crop images...
    for (const wallpaper of wallpapers) {
      if (wallpaperIds.includes(wallpaper.id)) {
        const image_path = path.join(album_dir_path, `${wallpaper.id}.webp`);
        try {
          await fs.access(image_path);
          console.log(`[!] - Validate image: Wallpaper ${wallpaper.id} already exists`);
        } catch (error) {
          if (await cropImageLink(wallpaper.url, image_path)) {
            console.log(`[!] - Validate image: This image has been cropped and saved in [${image_path}]`);
          }
        }
        // Push file to CDN...
        const { success, message, url } = await uploadCDN(image_path, `${resource.appCode}/${resource.appVersion}/albums/${albumId}/${wallpaper.id}.webp`);
        if (success) {
          console.log(`[!] - Upload this wallpaper ${wallpaper.id} into CDN success: ${url}`);
        } else {
          console.error(`[x] - ${message}`);
        }
      }
    }
  } catch (error) {
    console.log(`[x] - Handle album results error: ${error.message}`);
  }
};

module.exports = { pushMissWallpapers };