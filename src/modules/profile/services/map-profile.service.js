
const fs = require('fs').promises;

const { ensureDirectoryExists, cropImageLink, readJSONFile, ensureJSONFileAndWrite, convertToWebp } = require("../../../utils/commonUtil");
const { uploadCDN } = require("../../album/services/cdnService");
const { getAllProfiles, getListWallpapersByProfileId } = require("../repositories/profile.repo");

/* -------------------------------------------------------------------------- */ 
/*                     Handle for App data (profiles)                         */ 
/* -------------------------------------------------------------------------- */

/**
 * Mapping App profile data
 * - Handle wallpapers (download & crop)
 * - Gen JSON file (data/app/profiles.json)
*/
const handleProfileResults = async (resource, phaseNumber = 1) => {

  let profileCount = 1;
  let listProfileIdsMapSuccess = [];

  const ALL_PROFILES = getAllProfiles();

  const profileIds = ALL_PROFILES.map((a) => a.id);

  for (const profileId of profileIds) {
    
    console.log(`\n[!] **** (${profileCount}/${profileIds.length}) Handle/mapping app profile data for: ${profileId}`);
    
    // Mapping app profile...
    await mappingAppProfile(
      resource, phaseNumber, 
      profileId, ALL_PROFILES, listProfileIdsMapSuccess
    );
    profileCount++;
  }
  console.log(`\n[!] Handle/mapping app profile data for ${listProfileIdsMapSuccess.length}/${profileIds.length} complete!`);
};

/* -------------------------------------------------------------------------- */ 
/*                          Mapping App profiles data                         */ 
/* -------------------------------------------------------------------------- */

/**
 * - Download & Crop wallpapers of all profile
 * - Push wallpapers into CDN Service
 */
const handleWallpapers = async (resource, profile, customWallpapers) => {

  let exposeImageUrls = [];

  const wallpaper_base_url = `${resource.hostUrl}/${resource.appCode}/${resource.appVersion}/profiles`;

  // Create profile folder (data/profiles/results/?) if not exists...
  const profile_dir_path = path.join(process.env.PROFILES_RESULTS_PATH, String(profile.id));
  await ensureDirectoryExists(profile_dir_path);

  // Handle thumb & backgound files uploaded...
  if (profile.avatarPath && profile.avatarPath !== '') {
    const image_path = await convertToWebp(profile.avatarPath);
    if (image_path) {
      const { success, message, url } = await uploadCDN(image_path, `${resource.appCode}/${resource.appVersion}/profiles/${profile.id}/avatar.webp`);
      if (success) {
        console.log(`[!] - Upload avatar (of ${profile.id}) into CDN success: ${url}`);
      } else {
        console.error(`[x] - ${message}`);
      }
    }
  }
  if (profile.backgoundPath && profile.backgoundPath !== '') {
    const image_path = await convertToWebp(profile.backgoundPath);
    if (image_path) {
      const { success, message, url } = await uploadCDN(image_path, `${resource.appCode}/${resource.appVersion}/profiles/${profile.id}/backgound.webp`);
      if (success) {
        console.log(`[!] - Upload backgound (of ${profile.id}) into CDN success: ${url}`);
      } else {
        console.error(`[x] - ${message}`);
      }
    }
  }

  // Get wallpapers of target profile...
  const wallpapers = customWallpapers || getListWallpapersByProfileId(profile, true, false, undefined);

  // Download & Crop images...
  for (const wallpaper of wallpapers) {
    const image_path = path.join(profile_dir_path, `${wallpaper.id}.webp`);
    try {
      await fs.access(image_path);
      exposeImageUrls.push(`${wallpaper_base_url}/${profile.id}/${wallpaper.id}.webp`);
      console.log(`[!] - Validate image: Wallpaper ${wallpaper.id} already exists`);
      continue;
    } catch (error) {
      if (await cropImageLink(wallpaper.url, image_path)) {
        exposeImageUrls.push(`${wallpaper_base_url}/${profile.id}/${wallpaper.id}.webp`);
        console.log(`[!] - Validate image: This image has been cropped and saved in [${image_path}]`);
        // Push file to CDN...
        const { success, message, url } = await uploadCDN(image_path, `${resource.appCode}/${resource.appVersion}/profiles/${profile.id}/${wallpaper.id}.webp`);
        if (success) {
          console.log(`[!] - Upload this wallpaper ${wallpaper.id} into CDN success: ${url}`);
        } else {
          console.error(`[x] - ${message}`);
        }
      }
    }
  }
  return exposeImageUrls;
};

/**
 * Mapping App profile to JSON file
 */
async function exportAppProfile(profile) {
  try {
    const filePath = path.join(process.env.APP_RESULTS_PATH, `profiles.json`);
    let allProfiles = await readJSONFile(filePath, 'utf8');
    // Check profile existed...
    const profileExisted = allProfiles.find(a => a.id === profile.id);
    if (!profileExisted) {
      allProfiles.push(profile); // Add new profile
    } 
    // Update profile edited...
    else {
      allProfiles = allProfiles.map((a) => {
        if (a.id===profile.id) return profile;
        return a;
      });
    }
    await ensureJSONFileAndWrite(filePath, allProfiles);
    return {success: true};
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Main flow for mapping process
 */
const mappingAppProfile = async (
  resource, 
  phaseNumber, 
  profileId, 
  allProfiles, 
  listProfileIdsMapSuccess
) => {
  try {
    // Get idx of target profile...
    const profileIndex = allProfiles.findIndex(profile => profile.id === profileId);
    if (profileIndex === -1) {
      throw new Error(`profile not found!`);
    }
    
    // Get target profile by idx...
    const profile = allProfiles[profileIndex];
    console.log(`[!] - Find profile success: ${profile.name}`);

    if (profile.mapStatus) {
      console.log(`[o] - profile has been mapped, skip this profile!`);
      return;
    }

    // Download, Crop, Push wallpapers...
    const exposeImageUrls = await handleWallpapers(resource, profile, undefined);

    // Mapping profiles result to JSON file...
    const base_url = `${resource.hostUrl}/${resource.appCode}/${resource.appVersion}/profiles/${profileId}`;
    const result = await exportAppProfile(
      {
        id: profile.id,
        name: profile.name,
        thumb_url: `${base_url}/${profile.thumb}.webp`,
        avatar_url: `${base_url}/avatar.webp`,
        background_url: `${base_url}/background.webp`,
        photos_url: exposeImageUrls,
        phase: Number(phaseNumber)
      }
    );

    if (result.success) {
      console.log(`[!] - Handle profile results for profile (${profileId}) success`);
      listProfileIdsMapSuccess.push(profileId);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.log(`[x] - Handle profile results error: ${error.message}`);
  }
};

module.exports = { handleProfileResults };