
const { readJSONFile, ensureJSONFileAndWrite } = require("../../../utils/commonUtil");
const { detectNSFW } = require("../../album/services/verifyService");
const { Profile } = require("../dtos/profile.dto");
const { 
  loadAllProfileWallpapers, updateAllProfileWallpapers, 
  getAllProfileWallpapers, getAllProfileWallpaperIds, getListWallpapersByProfileId,
  loadAllProfiles, updateAllProfiles, getAllProfiles,
} = require("../repositories/profile.repo");

/* -------------------------------------------------------------------------- */ 
/*                             Common Manager logics                          */ 
/* -------------------------------------------------------------------------- */

const getProfilesInfo = async () => {
  try {
    console.log(`\n[!] Get profiles info...`);
    const totalProfiles = getAllProfiles().length;
    const totalWallpapers = getAllProfileWallpapers().length;
    console.log(`[!] - Get profiles info success: ${totalProfiles} profiles, ${totalWallpapers} wallpapers`);
    return {
      profiles: totalProfiles,
      wallpapers: totalWallpapers,
    };
  } catch (error) {
    console.log(`[x] - Get profiles info error: ${error.message}`);
  }
};

// For: Update map status of profiles
// async function updateProfileMapStatus(profileIds) {
//   try {
//     const newProfiles = getAllProfiles().map(profile => {
//       const newProfile = profileIds.find(id => id===profile.id);
//       if (newProfile) profile.mapStatus = true;
//       return profile;
//     });
//     await updateAllProfiles(newProfiles);
//   } catch (error) {}
// }

// Verify NSFW content
async function verifyProfile(profileId, verifyType) {

  let message;
  try {
    console.log(`\n[!] Verify images of profile: ${profileId}`);

    const ALL_PROFILES = getAllProfiles();
    const ALL_WALLPAPERS = getAllProfileWallpapers();

    if (verifyType==='NSFW') {

      let listRacy = [];
      let listAdult = [];

      const profile = ALL_PROFILES.find(profile => profile.id === Number(profileId));
      if (!profile) {
        throw new Error(`Profile not found: ${profileId}`);
      }
      const wallpapers = ALL_WALLPAPERS
        .filter(wallpaper => profile.wallpaperIds.includes(wallpaper.id));

      for (const wallpaper of wallpapers) {

        const { adult, racy } = await detectNSFW(wallpaper.preview_url);
        if (adult) listAdult.push(wallpaper.id);
        if (racy) listRacy.push(wallpaper.id);

        console.log(`[!] - Verify wallpaper: ${(adult)?'ADULT':((racy)?'RACY':'NORMAL')} | ${wallpaper.preview_url}`);
      }
      console.log(`[!] - Result: ${listAdult.length} adults, ${listRacy.length} racy`);

      // Update data/profiles/profiles.json file...
      if (listRacy.length > 0 || listAdult.length > 0) {
        const newAllProfiles = ALL_PROFILES.map((profile) => {
          if (profile.id === Number(profileId)) {
            profile.nsfw.adult = listAdult;
            profile.nsfw.racy = listRacy;
          }
          return profile;
        });
        await updateAllProfiles(newAllProfiles);
      }
      message = `Result of verify: ${listAdult.length} adults, ${listRacy.length} racy`;
      return { message, result: { adult: listAdult, racy: listRacy } };
    }
  } catch (error) {
    console.error(`[x] - Error verifing: ${error.message}`);
    message = `Error verify: ${error.message}`;
  }
  return { message };
}

// For: Remove wallpaper from profile && Change wallpaper status
const removeFromBlacklist = async (wallpaperId, collection_id, track_collection) => {
  try {
    let filePath;

    // For wallpaper has type: Collection
    if (track_collection.type==='collection') {
      filePath = `data/collections/${track_collection.provider}/collections/${track_collection.targetId}/${collection_id}.json`;
    } 
    // For wallpaper has type: Work
    else if (track_collection.type==='work') {
      filePath = `data/collections/${track_collection.provider}/works/${track_collection.targetId}.json`;
    }
    
    const wallpapers = await readJSONFile(`${filePath}`);
    const wallpapersUpdated = wallpapers.map((w) => {
      if (w.id === wallpaperId) {
        return { ...w, status: true }; // Change showing state
      } else {
        return w;
      }
    });
    await ensureJSONFileAndWrite(filePath, wallpapersUpdated);

    console.log(`[!] - Remove wallpaper has id '${wallpaperId}' (target: ${track_collection.targetId}) from profile successfully.`);
    
  } catch (error) {
    console.error(`[x] - Remove wallpaper has id ${wallpaperId} from profile failed: ${error.message}`);
  }
};

/* -------------------------------------------------------------------------- */ 
/*                             Profiles Manager logics                        */ 
/* -------------------------------------------------------------------------- */ 

const getProfile = async (profileId) => {
  try {
    console.log(`\n[!] Get profile: ${profileId}`);
    
    const profile = getAllProfiles().find(profile => profile.id === Number(profileId));
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }
    console.log(`[!] - Get profile success, has name: ${profile.name}`);
    return profile;
  } catch (error) {
    console.log(`[x] - Get profile error: ${error.message}`);
  }
};

const getImagesByProfileId = async (profileId, getFullFields, getHighQualityUrl) => {
  try {
    console.log(`\n[!] Get images of profile: ${profileId}`);

    const profile = getAllProfiles().find(profile => profile.id === Number(profileId));
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }
    const imageUrls = getListWallpapersByProfileId(profile, getFullFields, getHighQualityUrl);

    console.log(`[!] - Get images of profile success, has ${imageUrls.length} images`);
    return imageUrls;

  } catch (error) {
    console.log(`[x] - Get images of profile error: ${error.message}`);
  }
};

const listProfiles = async () => {
  try {
    console.log(`\n[!] List all profiles`);
    const ALL_PROFILES = getAllProfiles();
    console.log(`[!] - List all profiles success, has ${ALL_PROFILES.length} profiles`);
    return ALL_PROFILES;
  } catch (error) {
    console.log(`[x] - List all profiles error: ${error.message}`);
  }
};

const createProfile = async (profileName, wallpaperIds) => {
  try {
    const profileId = Date.now();
    const ALL_PROFILES = getAllProfiles();

    console.log(`\n[!] Create a new profile: ${profileId}`);
    
    const newProfile = new Profile({ 
      id: profileId, 
      name: profileName, 
      thumb: '',
      avatarPath: '',
      backgoundPath: '',
      wallpaperIds: [],
      // mapStatus: false
    });
    ALL_PROFILES.push(newProfile);

    // Update json file
    await updateAllProfiles(ALL_PROFILES);

    console.log(`[!] - Create new profile success, has ${ALL_PROFILES.length} profiles`);
    return newProfile;
    
  } catch (error) {
    console.log(`[x] - Create new profile error: ${error.message}`);
  }
};

const deleteProfile = async (profileId) => {
  try {
    console.log(`\n[!] Delete profile: ${profileId}`);

    const ALL_PROFILES = getAllProfiles();

    const profileIndex = ALL_PROFILES.findIndex(profile => profile.id === Number(profileId));
    if (profileIndex === -1) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    // Sync for app Profile...
    // if (ALL_PROFILES[profileIndex].mapStatus) {
    //   await removeAppProfileAfterMapping(profileId); // Async runing
    // }

    // Remove wallpapers of Profile...
    const wallpaperIds = ALL_PROFILES[profileIndex].wallpaperIds;
    if (wallpaperIds.length > 0) {
      await removeWallpapersProcess(wallpaperIds); // Async runing
    }

    // Remove profile data from ALL_PROFILES
    ALL_PROFILES.splice(profileIndex, 1);
    // Update data/profiles/profiles.json file...
    await updateAllProfiles(ALL_PROFILES);

    console.log(`[!] - Delete profile success, has ${ALL_PROFILES.length} profiles`);

  } catch (error) {
    console.log(`[x] - Delete profile error: ${error.message}`);
  }
};

const removeWallpapersProcess = async (wallpaperIds) => {
  
  const { listIncluded, listExcluded } = getAllProfileWallpapers().reduce(
    (result, w) => {
      if (wallpaperIds.includes(w.id)) {
        result.listIncluded.push(w);
      } else {
        result.listExcluded.push(w);
      }
      return result;
    },
    { listIncluded: [], listExcluded: [] }
  );
  console.log(`[!] - Remove ${listExcluded.length} wallpapers, change collection status for ${listIncluded.length} wallpapers...`);
  
  // Remove wallpapers from list all wallpapers...
  await updateAllProfileWallpapers(listExcluded);

  // Change status of wallpapers from collection...
  for (const wallpaper of listIncluded) {
    await removeFromBlacklist(
      wallpaper.id, 
      wallpaper.folder_no, 
      {provider: 'seaart.ai', targetId: wallpaper.author_id, type: wallpaper.tracking_type}
    );
  }
};

module.exports = {
  getProfilesInfo, verifyProfile, removeFromBlacklist,
  getProfile, getImagesByProfileId, listProfiles, createProfile, deleteProfile
}