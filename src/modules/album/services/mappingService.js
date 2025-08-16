const path = require('path');
const fs = require('fs').promises;

const { uploadCDN } = require('./cdnService');
const { cropImageLink, readJSONFile, ensureDirectoryExists, getRandomIdx, shuffleArray, replaceWallpaperIdFromLink, getWallpaperIdFromLink } = require('../../../utils/commonUtil');

/* -------------------------------------------------------------------------- */ 

const { 
  loadAllCategories, updateAllCategories, getAllCategories,
  loadAllTags, updateAllTags, getAllTags,
  loadAllCountries, updateAllCountries, getAllCountries,
  loadAllWallpapers, updateAllWallpapers, getAllWallpapers, getAllWallpaperIds, getListWallpapersByAlbumId,
  loadAllAlbums, updateAllAlbums, getAllAlbums,
} = require('../repositories/albumRepository');

const { 
  updateAppTags, updateAppCategories, updateAppAlbums, updateAppCountries,
  getAllAppCategories, getAllAppTags, getAllAppAlbums, getAllAppCountries,
  getAppAlbumsByCategoryID, getAppAlbumsByTagID
} = require('../../app/repositories/appRepositories');

/* -------------------------------------------------------------------------- */ 
/*                       Mapping App albums data (First)                      */ 
/* -------------------------------------------------------------------------- */

/**
 * - Download & Crop wallpapers of all album
 * - Push wallpapers into CDN Service
 */
const handleWallpapers = async (resource, album, customWallpapers) => {

  let exposeImageUrls = [];

  const wallpaper_base_url = `${resource.hostUrl}/${resource.appCode}/${resource.appVersion}/albums`;

  // Create album folder (data/albums/results/?) if not exists...
  const album_dir_path = path.join(process.env.RESULTS_PATH, String(album.id));
  await ensureDirectoryExists(album_dir_path);

  // Get wallpapers of target album...
  const wallpapers = customWallpapers || getListWallpapersByAlbumId(album, true, false, undefined);

  // Download & Crop images...
  for (const wallpaper of wallpapers) {
    const image_path = path.join(album_dir_path, `${wallpaper.id}.webp`);
    try {
      await fs.access(image_path);
      exposeImageUrls.push(`${wallpaper_base_url}/${album.id}/${wallpaper.id}.webp`);
      console.log(`[!] - Validate image: Wallpaper ${wallpaper.id} already exists`);
      continue;
    } catch (error) {
      if (await cropImageLink(wallpaper.url, image_path)) {
        exposeImageUrls.push(`${wallpaper_base_url}/${album.id}/${wallpaper.id}.webp`);
        console.log(`[!] - Validate image: This image has been cropped and saved in [${image_path}]`);
        // Push file to CDN...
        const { success, message, url } = await uploadCDN(image_path, `${resource.appCode}/${resource.appVersion}/albums/${album.id}/${wallpaper.id}.webp`);
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
 * Mapping App album to JSON file
 */
async function exportAppAlbum(album) {
  try {
    const filePath = path.join(process.env.APP_RESULTS_PATH, `albums.json`);
    let allAlbums = await readJSONFile(filePath, 'utf8');
    // Check album existed...
    const albumExisted = allAlbums.find(a => a.id === album.id);
    if (!albumExisted) {
      allAlbums.push(album); // Add new album
    } 
    // Update album edited...
    else {
      allAlbums = allAlbums.map((a) => {
        if (a.id===album.id) return album;
        return a;
      });
    }
    await updateAppAlbums(allAlbums);
    return {success: true};
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Main flow for mapping process
 */
const mappingAppAlbum = async (
  resource, phaseNumber, 
  albumId, allAlbums, 
  listAlbumIdsMapSuccess
) => {
  try {
    // Get idx of target album...
    const albumIndex = allAlbums.findIndex(album => album.id === albumId);
    if (albumIndex === -1) {
      throw new Error(`Album not found!`);
    }
    
    // Get target album by idx...
    const album = allAlbums[albumIndex];
    console.log(`[!] - Find album success: ${album.name}`);

    if (album.mapStatus) {
      console.log(`[o] - Album has been mapped, skip this album!`);
      return;
    }

    // Download, Crop, Push wallpapers...
    const exposeImageUrls = await handleWallpapers(resource, album, undefined);

    // Mapping albums result to JSON file...
    const result = await exportAppAlbum(
      {
        id: album.id,
        name: album.name,
        categoryId: album.categoryId,
        tags: album.tags,
        thumb_url: `${resource.hostUrl}/${resource.appCode}/${resource.appVersion}/albums/${albumId}/${album.thumb}.webp`,
        photos_url: exposeImageUrls,
        phase: Number(phaseNumber)
      }
    );

    if (result.success) {
      console.log(`[!] - Handle album results for album (${albumId}) success`);
      listAlbumIdsMapSuccess.push(albumId);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.log(`[x] - Handle album results error: ${error.message}`);
  }
};

/* -------------------------------------------------------------------------- */ 
/*                      Mapping App categories, tags data                     */ 
/* -------------------------------------------------------------------------- */

const mappingCategoriesAndTags = async (wallpaper_base_url, allAbums, allCategories, allTags) => {

  const allAppAlbums = getAllAlbums();

  const listCategoryIds = new Set(allAppAlbums.map(a => a.categoryId));
  const listTagNames = new Set(allAppAlbums.flatMap(a => a.tags));

  // App categories
  const allCategoriesApp = allCategories.filter((ctg) => listCategoryIds.has(ctg.id));
  if (allCategoriesApp && allCategoriesApp.length > 0) await updateAppCategories(allCategoriesApp);

  // App tags
  const allTagsApp = allTags.filter((tag) => listTagNames.has(tag.name)).map((tag) => {
    const album = shuffleArray([...allAbums]).find((album) => album.tags.includes(tag.name));
    if (album) {
      const thumbIdRandom = album.wallpaperIds[getRandomIdx(album.wallpaperIds)];
      return {
        ...tag,
        thumb: `${wallpaper_base_url}/${album.id}/${thumbIdRandom}.webp`,
      }
    }
    return tag;
  });
  if (allTagsApp && allTagsApp.length > 0) await updateAppTags(allTagsApp);

  console.log(`[!] - Handle/mapping app categories & tags success: ${allCategoriesApp.length} categories, ${allTagsApp.length} tags`);
};

/* -------------------------------------------------------------------------- */ 
/*                  Update single App album data (After mapped)               */ 
/* -------------------------------------------------------------------------- */

/**
 * Update & sync App album (after mapping data)
 */
const updateAppAlbumAfterMapping = async (resource, newAlbum, newWallpaperIds, remaininWallpapergIds) => {

  console.log(`\n[!] Update & sync App album: ${newAlbum.id}`);
  try {
    const ALL_APP_ALBUMS = getAllAppAlbums();

    const appAlbum = ALL_APP_ALBUMS.find((a) => a.id===newAlbum.id);

    if (!appAlbum) throw new Error(`Album not found!`);

    if (newWallpaperIds && newWallpaperIds.length > 0) {

      // Get wallpapers detail...
      const newWallpapers = getAllWallpapers().filter((w) => newWallpaperIds.includes(w.id));

      console.log(`[!] - Add ${newWallpapers.length} new wallpapers of this album...`);
      console.log(newWallpapers);

      // Add new wallpapers of this App album (If have)...
      const exposeUrls = await handleWallpapers(resource, appAlbum, newWallpapers);
      if (exposeUrls && exposeUrls.length > 0) {
        appAlbum.photos_url.push(...exposeUrls);
        console.log(`[!] - Handle/push ${exposeUrls.length} new wallpapers success`);
      }
      
    } else {

      console.log(`[!] - Change name / catefory / tags / countries / thumb / remove wallpapers of this album...`);
      
      const ALL_APP_CATEGORIES = getAllAppCategories();
      const ALL_APP_TAGS = getAllAppTags();
      const ALL_APP_COUNTRIES = getAllAppCountries();

      // 0. Change new name of this App album (If diff)...
      if (appAlbum.name !== newAlbum.name) {
        appAlbum.name = newAlbum.name;
      }

      // 1. Add new category of this App album (If have)...
      const appCategoryExisted = ALL_APP_CATEGORIES.find((ctg) => ctg.id===newAlbum.categoryId);
      if (!appCategoryExisted) {
        const category = getAllCategories().find((ctg) => ctg.id===newAlbum.categoryId);
        if (category) {
          appAlbum.categoryId = category.id;
          // Update data to JSON file
          ALL_APP_CATEGORIES.push(category);
          await updateAppCategories(ALL_APP_CATEGORIES);
          // Debug
          console.log(`[!] - Update new category success: ${category.id} (${category.name})`);
        }
      } else {
        // Change category...
        if (appAlbum.categoryId !== newAlbum.categoryId) {
          appAlbum.categoryId = newAlbum.categoryId;
          // Debug
          console.log(`[!] - Update new category success: ${appAlbum.categoryId}`);
        }
      }

      // 2. Add new tags of this App album (If have)...
      for (const tagName of newAlbum.tags) {
        const appTagExisted = ALL_APP_TAGS.find((t) => t.name===tagName);
        if (!appTagExisted) {
          const tag = getAllTags().find((t) => t.name===tagName);
          if (tag) {
            appAlbum.tags.push(tag.name);
            // Update data to JSON file
            ALL_APP_TAGS.push(tag);
            await updateAppTags(ALL_APP_TAGS);
            // Debug
            console.log(`[!] - Update new tag success: ${tag.name}`);
          }
        } else {
          // Change tag...
          if (!appAlbum.tags.includes(tagName)) {
            appAlbum.tags.push(tagName);
            // Debug
            console.log(`[!] - Update new tag success: ${tagName}`);
          }
        }
      }
      // Remove old tags (has changed by diff tag)
      appAlbum.tags = appAlbum.tags.filter((t) => newAlbum.tags.includes(t));

      // 3. Add new countries of this App album (If have)...
      if (!appAlbum.countries) appAlbum.countries = [];
      for (const countryName of newAlbum.countries) {
        const appCountryExisted = ALL_APP_COUNTRIES.find((c) => c.name===countryName);
        if (!appCountryExisted) {
          const country = getAllCountries().find((c) => c.name===countryName);
          if (country) {
            appAlbum.countries.push(country.name);
            // Update data to JSON file
            ALL_APP_COUNTRIES.push(country);
            await updateAppCountries(ALL_APP_COUNTRIES);
            // Debug
            console.log(`[!] - Update new country success: ${country.name}`);
          }
        } else {
          // Change country...
          if (!appAlbum.countries.includes(countryName)) {
            appAlbum.countries.push(countryName);
            // Debug
            console.log(`[!] - Update new country success: ${countryName}`);
          }
        }
      }
      // Remove old countries (has changed by diff country)
      appAlbum.countries = appAlbum.countries.filter((c) => newAlbum.countries.includes(c));

      // 4. Change new thumb of this App album (If diff)...
      if (!appAlbum.thumb_url.includes(newAlbum.thumb)) {
        appAlbum.thumb_url = replaceWallpaperIdFromLink(appAlbum.thumb_url, newAlbum.thumb);
        // Debug
        console.log(`[!] - Update new thumb success: ${appAlbum.thumb_url}`);
      }

      // 5. Remove wallpapers
      if (remaininWallpapergIds && remaininWallpapergIds.length > 0) {
        appAlbum.photos_url = appAlbum.photos_url.filter((url) => !remaininWallpapergIds.includes(getWallpaperIdFromLink(url)));
        // Debug
        console.log(`[!] - Remove ${remaininWallpapergIds.length} wallpapers success: ${remaininWallpapergIds}`);
      }
    }
    
    // Update data of this App album (in JSON file)...
    const newAppAlbums = ALL_APP_ALBUMS.map((a) => {
      if (a.id===appAlbum.id) return appAlbum;
      return a;
    });
    await updateAppAlbums(newAppAlbums);

    console.log(`[!] - Update & sync App album complete: ${JSON.stringify(appAlbum,null,2)}`);
    
  } catch (error) {
    console.error(`[x] - Update & sync App album failed: ${error.message}`);
  }
};

/**
 * Remove App album (after mapping data)
 */
const removeAppAlbumAfterMapping = async (albumId) => {
  try {
    const ALL_APP_ALBUMS = getAllAppAlbums();

    const albumIndex = ALL_APP_ALBUMS.findIndex(album => album.id === Number(albumId));
    if (albumIndex === -1) {
      throw new Error(`App Album not found: ${albumId}`);
    }
    // Remove data of this App album (in JSON file)...
    ALL_APP_ALBUMS.splice(albumIndex, 1);
    // Update data/app/albums.json file...
    await updateAppAlbums(ALL_APP_ALBUMS);

    console.log(`[!] - Remove App album ${albumId} complete!`);

  } catch (error) {
    console.error(`[x] - Remove App album failed: ${error.message}`);
  }
};

module.exports = {
  mappingAppAlbum, handleWallpapers,
  mappingCategoriesAndTags,
  updateAppAlbumAfterMapping, removeAppAlbumAfterMapping
};