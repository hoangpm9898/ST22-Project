
const { detectNSFW } = require('./verifyService');
const { Album, AlbumWallpaper, Category } = require('../models/album');
const { readJSONFile, ensureJSONFileAndWrite, getMaxId, getHighImageUrl, getRandomIdx } = require('../../../utils/commonUtil');

const { mappingAppAlbum, mappingCategoriesAndTags, updateAppAlbumAfterMapping, removeAppAlbumAfterMapping } = require('./mappingService');

const { 
  loadAllCategories, updateAllCategories, getAllCategories,
  loadAllTags, updateAllTags, getAllTags,
  loadAllCountries, updateAllCountries, getAllCountries,
  loadAllWallpapers, updateAllWallpapers, getAllWallpapers, getAllWallpaperIds, getListWallpapersByAlbumId,
  loadAllAlbums, updateAllAlbums, getAllAlbums,
} = require('../repositories/albumRepository');

/* -------------------------------------------------------------------------- */ 
/*                             Common Manager logics                          */ 
/* -------------------------------------------------------------------------- */ 

const getCategories = async () => {
  try {
    console.log(`\n[!] Get all categories`);
    const ALL_CATEGORIES = getAllCategories();
    console.log(`[!] - Get all categories success, has ${ALL_CATEGORIES.length} categories`);
    return ALL_CATEGORIES;
  } catch (error) {
    console.log(`[x] - Get all categories error: ${error.message}`);
  }
};

const getTags = async () => {
  try {
    console.log(`\n[!] Get all tags`);
    const ALL_TAGS = getAllTags();
    console.log(`[!] - Get all tags success, has ${ALL_TAGS.length} tags`);
    return ALL_TAGS;
  } catch (error) {
    console.log(`[x] - Get all tags error: ${error.message}`);
  }
};

const getAlbumsInfo = async () => {
  try {
    console.log(`\n[!] Get albums info...`);
    const totalAlbums     = getAllAlbums().length;
    const totalWallpapers = getAllWallpapers().length;
    const totalCategories = getAllCategories().length;
    const totalTags       = getAllTags().length;
    console.log(`[!] - Get albums info success: ${totalAlbums} albums, ${totalWallpapers} wallpapers, ${totalCategories} categories, ${totalTags} tags`);
    return {
      albums: totalAlbums,
      wallpapers: totalWallpapers,
      categories: totalCategories,
      tags: totalTags,
    };
  } catch (error) {
    console.log(`[x] - Get albums info error: ${error.message}`);
  }
};

// Refresh category data of album
const refreshCategoryData = async (categorieName, allCategories) => {
  const ALL_CATEGORIES = allCategories || getAllCategories();
  if (ALL_CATEGORIES.length > 0) {
    const maxCategoryId = getMaxId(ALL_CATEGORIES.map((ctg) => ctg.id));
    const existed = ALL_CATEGORIES.find((ctg) => ctg.name===categorieName);
    if (!existed) {
      ALL_CATEGORIES.push({
        id: maxCategoryId+1,
        name: categorieName,
        thumb: '',
      });
      await updateAllCategories(ALL_CATEGORIES);
      return maxCategoryId+1;
    } else {
      return existed.id;
    }
  } else {
    // For first...
    ALL_CATEGORIES.push({
      id: 0,
      name: categorieName,
      thumb: '',
    });
    await updateAllCategories(ALL_CATEGORIES);
    return 0;
  }
};

// Refresh tags data of album
const refreshTagData = async (tagNames, allTags, albumId, resource) => {
  const ALL_TAGS = allTags || getAllTags();
  const album = getAllAlbums().find(album => album.id === Number(albumId));
  const thumbIdRandom = album.wallpaperIds[getRandomIdx(album.wallpaperIds)];
  for (const tagName of tagNames) {
    if (ALL_TAGS.length > 0) {
      const maxTagId = getMaxId(ALL_TAGS.map((tag) => tag.id));
      const existed = ALL_TAGS.find((tag) => tag.name===tagName);
      if (!existed) {
        ALL_TAGS.push({
          id: maxTagId+1,
          name: tagName,
          thumb: `${resource.hostUrl}/${resource.appCode}/${resource.appVersion}/albums/${albumId}/${thumbIdRandom}.webp`,
        });
        await updateAllTags(ALL_TAGS);
      }
    } else {
      // For first...
      ALL_TAGS.push({
        id: 0,
        name: tagName,
        thumb: '',
      });
      await updateAllTags(ALL_TAGS);
    }
  }
};

// Refresh countries data of album
const refreshCountryData = async (countryNames) => {
  const ALL_COUNTRIES = getAllCountries();
  for (const countryName of countryNames) {
    if (ALL_COUNTRIES.length > 0) {
      const maxCountryId = getMaxId(ALL_COUNTRIES.map((country) => country.id));
      const existed = ALL_COUNTRIES.find((country) => country.name===countryName);
      if (!existed) {
        ALL_COUNTRIES.push({
          id: maxCountryId+1,
          name: countryName,
        });
        await updateAllCountries(ALL_COUNTRIES);
      }
    } else {
      // For first...
      ALL_COUNTRIES.push({
        id: 0,
        name: countryName,
      });
      await updateAllCountries(ALL_COUNTRIES);
    }
  }
};

// For: Remove wallpaper from album && Change wallpaper status
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

    console.log(`[!] - Remove wallpaper has id '${wallpaperId}' (target: ${track_collection.targetId}) from album successfully.`);
    
  } catch (error) {
    console.error(`[x] - Remove wallpaper has id ${wallpaperId} from album failed: ${error.message}`);
  }
};

// For: Update map status of albums
async function updateMapStatus(albumIds) {
  try {
    const newAlbums = getAllAlbums().map(album => {
      const newAlbum = albumIds.find(albumId => albumId===album.id);
      if (newAlbum) album.mapStatus = true;
      return album;
    });
    await updateAllAlbums(newAlbums);
  } catch (error) {}
}

// Verify NSFW content
async function verifyAlbum(albumId, verifyType) {

  let message;
  try {
    console.log(`\n[!] Verify images of album: ${albumId}`);

    const ALL_ALBUMS = getAllAlbums();
    const ALL_WALLPAPERS = getAllWallpapers();

    // Verify
    if (verifyType==='NSFW') {

      let listRacy = [];
      let listAdult = [];

      const album = ALL_ALBUMS.find(album => album.id === Number(albumId));
      if (!album) {
        throw new Error(`Album not found: ${albumId}`);
      }
      const wallpapers = ALL_WALLPAPERS
        .filter(wallpaper => album.wallpaperIds.includes(wallpaper.id));

      for (const wallpaper of wallpapers) {

        const { adult, racy } = await detectNSFW(wallpaper.preview_url);
        if (adult) listAdult.push(wallpaper.id);
        if (racy) listRacy.push(wallpaper.id);

        console.log(`[!] - Verify wallpaper: ${(adult)?'ADULT':((racy)?'RACY':'NORMAL')} | ${wallpaper.preview_url}`);
      }
      console.log(`[!] - Result: ${listAdult.length} adults, ${listRacy.length} racy`);

      // Update data/albums/albums.json file...
      if (listRacy.length > 0 || listAdult.length > 0) {
        const newAllAlbums = ALL_ALBUMS.map((album) => {
          if (album.id === Number(albumId)) {
            album.nsfw.adult = listAdult;
            album.nsfw.racy = listRacy;
          }
          return album;
        });
        await updateAllAlbums(newAllAlbums);
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

/* -------------------------------------------------------------------------- */ 
/*                             Albums Manager logics                          */ 
/* -------------------------------------------------------------------------- */ 

const getAlbum = async (albumId) => {
  try {
    console.log(`\n[!] Get album: ${albumId}`);
    
    const album = getAllAlbums().find(album => album.id === Number(albumId));
    if (!album) {
      throw new Error(`Album not found: ${albumId}`);
    }
    console.log(`[!] - Get album success, has name: ${album.name}`);
    return album;
  } catch (error) {
    console.log(`[x] - Get album error: ${error.message}`);
  }
};

const getImagesByAlbumId = async (albumId, getFullFields, getHighQualityUrl) => {
  try {
    console.log(`\n[!] Get images of album: ${albumId}`);

    const album = getAllAlbums().find(album => album.id === Number(albumId));
    if (!album) {
      throw new Error(`Album not found: ${albumId}`);
    }
    const imageUrls = getListWallpapersByAlbumId(album, getFullFields, getHighQualityUrl);

    console.log(`[!] - Get images of album success, has ${imageUrls.length} images`);
    return imageUrls;

  } catch (error) {
    console.log(`[x] - Get images of album error: ${error.message}`);
  }
};

const listAlbums = async () => {
  try {
    console.log(`\n[!] List all albums`);
    const ALL_ALBUMS = getAllAlbums();
    console.log(`[!] - List all albums success, has ${ALL_ALBUMS.length} albums`);
    return ALL_ALBUMS;
  } catch (error) {
    console.log(`[x] - List all albums error: ${error.message}`);
  }
};

const createAlbum = async (albumName, wallpaperIds) => {
  try {
    const albumId = Date.now();
    const ALL_ALBUMS = getAllAlbums();

    console.log(`\n[!] Create a new album: ${albumId}`);
    
    const newAlbum = new Album({ 
      id: albumId, 
      name: albumName, 
      categoryId: 0, 
      thumb: '',
      wallpaperIds: [],
      mapStatus: false
    });
    ALL_ALBUMS.push(newAlbum);

    // Update json file
    await updateAllAlbums(ALL_ALBUMS);

    console.log(`[!] - Create new album success, has ${ALL_ALBUMS.length} albums`);
    return newAlbum;
    
  } catch (error) {
    console.log(`[x] - Create new album error: ${error.message}`);
  }
};

/**
 * Update album with 2 typeHandler:
 * - ADD: Add new list wallpapers into album
 * - UPDATE: Change name, category, tags, countries and thumb of album
 */
const updateAlbum = async (
  typeHandler, albumId, albumData, listWallpapers,
  resource = { 
    hostUrl: process.env.RESOURE_HOST_URL, 
    appCode: process.env.RESOURE_APP_CODE, 
    appVersion: process.env.RESOURE_APP_VERSION 
  }
) => {

  let error = false;
  let message;

  try {
    let albums = [];
    const ALL_WALLPAPERS = getAllWallpapers();

    let albumUpdated; // Mapping with App album...

    // I. Add new wallpapers into this Album
    if (typeHandler.toUpperCase()==='ADD') {

      let currentAlbum;
      let wallpaperExistedCount = 0;
      let wallpaperSuccessCount = 0;
      let wallpaperFailCount = 0;

      const ALL_WALLPAPER_IDS = getAllWallpaperIds();

      console.log(`\n[!] Add ${listWallpapers.length} wallpapers into album: ${albumId}`);

      for (const album of getAllAlbums()) {

        if (album.id === Number(albumId)) {

          currentAlbum = album; // Use for check field `mapStatus`

          for (const wallpaper of listWallpapers) {
            try {
              const wallpaperId = wallpaper.id;

              console.log(`[!] - Check wallpaper: ${wallpaperId}`);

              // Check if the wallpaper already exists in the album
              if (album.wallpaperIds.includes(wallpaperId)) {
                wallpaperExistedCount++;
                break;
              }

              // Push wallpaper ID into Album List
              album.wallpaperIds.push(wallpaperId);

              // Push wallpaper into Wallpapers List
              if (!ALL_WALLPAPER_IDS.has(wallpaperId)) {
                const newWallpaper = new AlbumWallpaper({
                  id: wallpaperId,
                  name: '',
                  url: await getHighImageUrl('seaart.ai', wallpaperId) || wallpaper.image_url,
                  preview_url: wallpaper.image_url,
                  albumId: Number(albumId),
                  model_id: wallpaper.model_id,
                  author_id: wallpaper.author_id,
                  folder_no: wallpaper.folder_no,
                  tracking_type: wallpaper.tracking_type,
                  tracking_collection_id: wallpaper.tracking_collection_id,
                });
                ALL_WALLPAPERS.push(newWallpaper);
                ALL_WALLPAPER_IDS.add(wallpaperId);
              }
              
              // Update data/albums/wallpapers.json file
              await updateAllWallpapers(ALL_WALLPAPERS);

              wallpaperSuccessCount++;

            } catch (error) {
              wallpaperFailCount++;
              console.error(`[x] - Error adding wallpaper (${wallpaper.id}) into album: ${error.message}`);
            }
          };
        }
        albums.push(album);
      }
      message = `success: ${wallpaperSuccessCount}, existed: ${wallpaperExistedCount}, fail: ${wallpaperFailCount}`;
      console.log(`[!] - Add ${listWallpapers.length} wallpapers into album completed (${message})`);
      
      // [IMPORTANT] Update/Sync app album...
      if (currentAlbum.mapStatus) updateAppAlbumAfterMapping(
        resource, 
        { id: Number(albumId) }, 
        listWallpapers.map((w) => w.id),
        undefined
      );
    }

    // II. Update album data...
    // - Album name, category, tags, thumb
    // - Remove wallpapers
    if (typeHandler.toUpperCase()==='UPDATE') {

      const ALL_CATEGORIES = getAllCategories();
      const ALL_TAGS = getAllTags();

      const remainingIds = listWallpapers; // List wallpaper ids will removing...

      console.log(`\n[!] Update data, remove wallpapers from album: ${albumId}`);

      albums = await Promise.all(
        getAllAlbums().map(async album => {
          if (album.id === Number(albumId)) {

            // DEBUG
            message = `Change`;

            // 1. Change thumb...
            if (albumData.thumbId && albumData.thumbId!=='') {
              album.thumb = albumData.thumbId;
              message = `${message} +thumb`;
            } else if (album.wallpaperIds.length > 0) {
              album.thumb = album.wallpaperIds[0];
            }

            // 2. Change name...
            if (albumData.albumName && albumData.albumName!=='') {
              album.name = albumData.albumName;
              message = `${message} +name`;
            }

            // 3. Change category...
            if (albumData.albumCategory && albumData.albumCategory!=='') {
              album.categoryId = await refreshCategoryData(albumData.albumCategory, ALL_CATEGORIES);
              message = `${message} +category`;
            }

            // 4. Change tags...
            if (albumData.albumTags && albumData.albumTags.length > 0) {
              album.tags = albumData.albumTags;
              message = `${message} +tags`;
              // add tags
              await refreshTagData(albumData.albumTags, ALL_TAGS, albumId, resource);
            }

            // 5. Change countries...
            if (albumData.albumCountries && albumData.albumCountries.length > 0) {
              album.countries = albumData.albumCountries;
              message = `${message} +countries`;
              // add countries
              await refreshCountryData(albumData.albumCountries, albumId, resource);
            }

            // 6. Remove wallpapapers...
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
              await updateAllWallpapers(newAllWallpapers);
              // (3) Remove from album wallpapers...
              album.wallpaperIds = album.wallpaperIds.filter(id => !remainingIds.includes(id));
              message = `${(message) ? `${message}. ` : ''}Remove ${remainingIds.length} wallpapers from album successfully`;
            }

            // [IMPORTANT] If mapped, has updating & sync data for app album...
            if (album.mapStatus) albumUpdated = album;
          }
          return album;
        })
      );
      console.log(`[!] - ${message}`);

      // [IMPORTANT] Update/Sync app album...
      if (albumUpdated) await updateAppAlbumAfterMapping(resource, albumUpdated, undefined, remainingIds);
    }

    // III. Update albums.json file
    await updateAllAlbums(albums);

  } catch (e) {
    error = true;
    message = `${typeHandler.toUpperCase()} wallpapers into album error: ${e.message}`;
    console.log(`[x] - ${message}`);
  }
  return { error, message };
};

const deleteAlbum = async (albumId) => {
  try {
    console.log(`\n[!] Delete album: ${albumId}`);

    const ALL_ALBUMS = getAllAlbums();

    const albumIndex = ALL_ALBUMS.findIndex(album => album.id === Number(albumId));
    if (albumIndex === -1) {
      throw new Error(`Album not found: ${albumId}`);
    }

    // Sync for app album...
    if (ALL_ALBUMS[albumIndex].mapStatus) {
      await removeAppAlbumAfterMapping(albumId); // Async runing
    }

    // Remove wallpapers of album...
    const wallpaperIds = ALL_ALBUMS[albumIndex].wallpaperIds;
    if (wallpaperIds.length > 0) {
      await removeWallpapersProcess(wallpaperIds); // Async runing
    }

    // Remove album data from ALL_ALBUMS
    ALL_ALBUMS.splice(albumIndex, 1);
    // Update data/albums/albums.json file...
    await updateAllAlbums(ALL_ALBUMS);

    console.log(`[!] - Delete album success, has ${ALL_ALBUMS.length} albums`);

  } catch (error) {
    console.log(`[x] - Delete album error: ${error.message}`);
  }
};

const removeWallpapersProcess = async (wallpaperIds) => {
  
  const { listIncluded, listExcluded } = getAllWallpapers().reduce(
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
  await updateAllWallpapers(listExcluded);

  // Change status of wallpapers from collection...
  for (const wallpaper of listIncluded) {
    await removeFromBlacklist(
      wallpaper.id, 
      wallpaper.folder_no, 
      {provider: 'seaart.ai', targetId: wallpaper.author_id, type: wallpaper.tracking_type}
    );
  }
};

/* -------------------------------------------------------------------------- */ 
/*            Handle for App data (albums, categories, tags)                  */ 
/* -------------------------------------------------------------------------- */ 

/**
 * Mapping App Albums data
 * - Handle wallpapers (download & crop)
 * - Gen JSON file (data/app/albums.json)
*/
const handleAlbumResults = async (resource, phaseNumber) => {

  let albumCount = 1;
  let listAlbumIdsMapSuccess = [];

  const ALL_ALBUMS = getAllAlbums();

  const albumIds = ALL_ALBUMS.map((a) => a.id);

  for (const albumId of albumIds) {
    
    console.log(`\n[!] **** (${albumCount}/${albumIds.length}) Handle/mapping app album data for: ${albumId}`);
    
    // Mapping app album...
    await mappingAppAlbum(
      resource, phaseNumber, 
      albumId, ALL_ALBUMS, listAlbumIdsMapSuccess
    );
    albumCount++;
  }
  console.log(`\n[!] Handle/mapping app album data for ${listAlbumIdsMapSuccess.length}/${albumIds.length} complete!`);

  // Update field `mapStatus` (from FALSE to TRUE) for each albums of list -> Confirm: Album has mapped !!!
  await updateMapStatus(listAlbumIdsMapSuccess);
};

/**
 * Mapping App Categories & Tags data
 * - Gen JSON file (data/app/categories.json & data/app/tags.json)
*/
const handleCategoriesAndTagsResults = async (resource) => {

  console.log(`\n[!] Handle/mapping app categories & tags data...`);
  try {
    const ALL_ALBUMS = getAllAlbums();
    const ALL_CATEGORIES = getAllCategories();
    const ALL_TAGS = getAllTags();

    const wallpaper_base_url = `${resource.hostUrl}/${resource.appCode}/${resource.appVersion}/albums`;

    await mappingCategoriesAndTags(wallpaper_base_url, ALL_ALBUMS, ALL_CATEGORIES, ALL_TAGS);
    
  } catch (error) {
    console.log(`[x] - Handle/mapping app categories & tags data fail: ${error.message}`);
  }
};

/* -------------------------------------------------------------------------- */ 

module.exports = { 
  loadAllWallpapers, updateAllWallpapers, getAllWallpaperIds,
  getCategories, getTags, getAlbumsInfo,
  getAlbum, getImagesByAlbumId, listAlbums, createAlbum, updateAlbum, deleteAlbum,
  verifyAlbum,
  handleAlbumResults, handleCategoriesAndTagsResults
};