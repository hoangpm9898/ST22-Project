
const { ProfileWallpaper } = require("../dtos/profile.dto");
const { removeFromBlacklist } = require("./profile.service");
const { 
  getAllProfiles, 
  getAllProfileWallpapers,
  getAllProfileWallpaperIds, 
  updateAllProfiles, 
  getListWallpapersByProfileId, 
  updateAllProfileWallpapers
} = require("../repositories/profile.repo");
const { getHighImageUrl } = require("../../../utils/commonUtil");

/**
 * Update profile with 2 typeHandler:
 * - ADD: Add new list wallpapers into profile
 * - UPDATE: Change name, category, tags, countries and thumb of profile
 */
const updateProfile = async (
  typeHandler, profileId, profileData, listWallpapers,
  resource = { 
    hostUrl: process.env.RESOURE_HOST_URL, 
    appCode: process.env.RESOURE_APP_CODE, 
    appVersion: process.env.RESOURE_APP_VERSION 
  }
) => {

  let error = false;
  let message;

  try {
    let profiles = [];
    const ALL_WALLPAPERS = getAllProfileWallpapers();

    // I. Add new wallpapers into this profile
    if (typeHandler.toUpperCase()==='ADD') {

      let wallpaperExistedCount = 0;
      let wallpaperSuccessCount = 0;
      let wallpaperFailCount = 0;

      const ALL_WALLPAPER_IDS = getAllProfileWallpaperIds();

      console.log(`\n[!] Add ${listWallpapers.length} wallpapers into profile: ${profileId}`);

      for (const profile of getAllProfiles()) {

        if (profile.id === Number(profileId)) {

          for (const wallpaper of listWallpapers) {
            try {
              const wallpaperId = wallpaper.id;

              console.log(`[!] - Check wallpaper: ${wallpaperId}`);

              // Check if the wallpaper already exists in the profile
              if (profile.wallpaperIds.includes(wallpaperId)) {
                wallpaperExistedCount++;
                break;
              }

              // Push wallpaper ID into profile List
              profile.wallpaperIds.push(wallpaperId);

              // Push wallpaper into Wallpapers List
              if (!ALL_WALLPAPER_IDS.has(wallpaperId)) {
                const newWallpaper = new ProfileWallpaper({
                  id: wallpaperId,
                  name: '',
                  url: await getHighImageUrl('seaart.ai', wallpaperId) || wallpaper.image_url,
                  preview_url: wallpaper.image_url,
                  profileId: Number(profileId),
                  model_id: wallpaper.model_id,
                  author_id: wallpaper.author_id,
                  folder_no: wallpaper.folder_no,
                  tracking_type: wallpaper.tracking_type,
                  tracking_collection_id: wallpaper.tracking_collection_id,
                });
                ALL_WALLPAPERS.push(newWallpaper);
                ALL_WALLPAPER_IDS.add(wallpaperId);
              }
              
              // Update data/profiles/wallpapers.json file
              await updateAllProfileWallpapers(ALL_WALLPAPERS);

              wallpaperSuccessCount++;

            } catch (error) {
              wallpaperFailCount++;
              console.error(`[x] - Error adding wallpaper (${wallpaper.id}) into profile: ${error.message}`);
            }
          };
        }
        profiles.push(profile);
      }
      message = `success: ${wallpaperSuccessCount}, existed: ${wallpaperExistedCount}, fail: ${wallpaperFailCount}`;
      console.log(`[!] - Add ${listWallpapers.length} wallpapers into profile completed (${message})`);
    }

    // II. Update profile data...
    // - Profile name, thumb
    // - Remove wallpapers
    if (typeHandler.toUpperCase()==='UPDATE') {

      const remainingIds = listWallpapers; // List wallpaper ids will removing...

      console.log(`\n[!] Update data, remove wallpapers from profile: ${profileId}`);

      profiles = await Promise.all(
        getAllProfiles().map(async profile => {
          if (profile.id === Number(profileId)) {

            // DEBUG
            message = `Change`;

            // 1. Change thumb...
            if (profileData.thumbId && profileData.thumbId!=='') {
              profile.thumb = profileData.thumbId;
              message = `${message} +thumb`;
            } else if (profile.wallpaperIds.length > 0) {
              profile.thumb = profile.wallpaperIds[0];
            }

            // 2. Change name...
            if (profileData.profileName && profileData.profileName!=='') {
              profile.name = profileData.profileName;
              message = `${message} +name`;
            }

            // 3. Remove wallpapapers...
            if (remainingIds && remainingIds.length > 0) {
              // (1) Change status of wallpapers...
              for (const wid of remainingIds) {
                const wallpaper = ALL_WALLPAPERS.find((w) => w.id===wid);
                if (wallpaper) await removeFromBlacklist(
                  wallpaper.id, 
                  wallpaper.folder_no, 
                  {provider: 'seaart.ai', targetId: wallpaper.author_id, type: wallpaper.tracking_type}
                );
              }
              // (2) Remove wallpapers from list all wallpapers...
              const newAllWallpapers = ALL_WALLPAPERS.filter((w) => !remainingIds.includes(w.id));
              await updateAllProfileWallpapers(newAllWallpapers);
              // (3) Remove from profile wallpapers...
              profile.wallpaperIds = profile.wallpaperIds.filter(id => !remainingIds.includes(id));
              message = `${(message) ? `${message}. ` : ''}Remove ${remainingIds.length} wallpapers from profile successfully`;
            }
          }
          return profile;
        })
      );
      console.log(`[!] - ${message}`);
    }

    // III. Update profiles.json file
    await updateAllProfiles(profiles);

  } catch (e) {
    error = true;
    message = `${typeHandler.toUpperCase()} wallpapers into profile error: ${e.message}`;
    console.log(`[x] - ${message}`);
  }
  return { error, message };
};

/**
 * Update profile:
 * - Change metadata: name, list wallpapers (removed), avatar, background
 * - Change thumb
 */
const updateProfileDetail = async (newProfile) => {

  let error = false;
  let message;

  console.log(`\n[!] Update profile: ${newProfile.id}`);
  try {
    let remainingIds = [];
    const newAllProfiles = getAllProfiles().map((p) => {
      if (p.id === newProfile.id) {
        remainingIds = p.wallpaperIds.filter((id) => !newProfile.wallpaperIds.includes(id))
        return {
          ...p,
          name: newProfile.name,
          thumb: (newProfile.thumb) ? newProfile.thumb : p.thumb,
          avatarPath: newProfile.avatar,
          backgoundPath: newProfile.backgound,
          wallpaperIds: newProfile.wallpaperIds
        }
      }
      return p;
    });
    await updateAllProfiles(newAllProfiles);

    // Remove wallpapers
    if (remainingIds && remainingIds.length > 0) {
      // (1) Change status of wallpapers...
      for (const wid of remainingIds) {
        const wallpaper = getAllProfileWallpapers().find((w) => w.id===wid);
        if (wallpaper) await removeFromBlacklist(
          wallpaper.id, 
          wallpaper.folder_no, 
          {provider: 'seaart.ai', targetId: wallpaper.author_id, type: wallpaper.tracking_type}
        );
      }
      // (2) Remove wallpapers from list all wallpapers...
      const newAllWallpapers = getAllProfileWallpapers().filter((w) => !remainingIds.includes(w.id));
      await updateAllProfileWallpapers(newAllWallpapers);
    }
    
  } catch (error) {
    error = true;
    message = `Update profile error: ${e.message}`;
    console.log(`[x] - Update profile fail: ${message}`);
  }
  return { error, message };
};

module.exports = { updateProfile, updateProfileDetail };