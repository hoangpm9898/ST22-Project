const path = require('path');
const fs = require('fs').promises;

const { Profile, ProfileWallpaper } = require("../dtos/profile.dto");

/* -------------------------------------------------------------------------- */ 

let ALL_WALLPAPERS = [];
let ALL_WALLPAPER_ID_SET = [];
const loadAllProfileWallpapers = async (allWallpapers=undefined) => {
  if (allWallpapers) {
    Object.assign(ALL_WALLPAPERS, allWallpapers);
  } else {
    const wallpapers = JSON.parse(await fs.readFile(process.env.PROFILES_WALLPAPERS_PATH, 'utf8'));
    ALL_WALLPAPERS = wallpapers.map(wallpaper => new ProfileWallpaper(wallpaper));
  }
  ALL_WALLPAPER_ID_SET = new Set(ALL_WALLPAPERS.map(w => w.id));
};
const updateAllProfileWallpapers = async (wallpapers) => {
  await fs.writeFile(process.env.PROFILES_WALLPAPERS_PATH, JSON.stringify(wallpapers,null,2));
  await loadAllProfileWallpapers(wallpapers);
};
loadAllProfileWallpapers().then(() => {
  console.log(`\n[!] Loaded ${ALL_WALLPAPERS.length} profile wallpapers initially`);
});

/* -------------------------------------------------------------------------- */ 

let ALL_PROFILES = [];
const loadAllProfiles = async () => {
  const profiles = JSON.parse(await fs.readFile(process.env.PROFILES_DATA_PATH, 'utf8'));
  ALL_PROFILES = profiles.map(profile => new Profile(profile));
};
const updateAllProfiles = async (profiles) => {
  await fs.writeFile(process.env.PROFILES_DATA_PATH, JSON.stringify(profiles,null,2));
  await loadAllProfiles();
};
loadAllProfiles().then(() => {
  console.log(`\n[!] Loaded ${ALL_PROFILES.length} profiles initially`);
});

/* -------------------------------------------------------------------------- */ 
/*                     Get list of profiles, wallpapers                       */
/* -------------------------------------------------------------------------- */

// Get wallpapers
const getAllProfileWallpapers = () => {
  return ALL_WALLPAPERS;
};
// Get wallpaper Ids
const getAllProfileWallpaperIds = () => {
  return ALL_WALLPAPER_ID_SET;
};

// Get categories
const getAllProfiles= () => {
  return ALL_PROFILES;
};

// Get wallpapers by profile ID
const getListWallpapersByProfileId = (profile, getFullFields, getHighQualityUrl, customWallpaperIds) => {

  let wallpapaperUrls;

  // For add new wallpapers after mapping process...
  if (customWallpaperIds && customWallpaperIds.length > 0) {
    wallpapaperUrls = ALL_WALLPAPERS
      .filter(wallpaper => profile.wallpaperIds.includes(wallpaper.id));
    return wallpapaperUrls;
  }
  // For:
  // - Get wallpapers with dashboard request
  // - Add new wallpapers on mapping process
  if (getFullFields) {
    wallpapaperUrls = ALL_WALLPAPERS
      .filter(wallpaper => profile.wallpaperIds.includes(wallpaper.id));
  } else {
    wallpapaperUrls = ALL_WALLPAPERS
      .filter(wallpaper => profile.wallpaperIds.includes(wallpaper.id))
      .map((wallpaper) => (getHighQualityUrl) ? wallpaper.url : wallpaper.preview_url);
  }
  return wallpapaperUrls;
}

module.exports = {
  loadAllProfileWallpapers, updateAllProfileWallpapers, 
  getAllProfileWallpapers, getAllProfileWallpaperIds, getListWallpapersByProfileId,
  loadAllProfiles, updateAllProfiles, getAllProfiles,
};