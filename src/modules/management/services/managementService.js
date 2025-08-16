
const { readJSONFile, readDirectory, ensureJSONFileAndWrite } = require('../../../utils/commonUtil');
const { loadAllWallpapers, getAllWallpaperIds } = require('../../album/services/albumService');
const { loadAllProfileWallpapers, getAllProfileWallpaperIds } = require('../../profile/repositories/profile.repo');

/**
 * Get/Update blacklist from file
 */
let BLACKLIST_SET = new Set();
const loadBlacklist = async () => {
  await loadAllWallpapers();
  BLACKLIST_SET.add(...getAllWallpaperIds());
  // console.log(`*** Loaded ${BLACKLIST_SET.size} wallpapers (album) in blacklist`);
  await loadAllProfileWallpapers();
  BLACKLIST_SET.add(...getAllProfileWallpaperIds());
  // console.log(`*** Loaded ${BLACKLIST_SET.size} wallpapers (album + profile) in blacklist`);
};
// getBacklist();

/**
 * Get/Update tracking-collections from file
 */
let trackingCollections = [];
const updateTrackingCollections = async () => {
  trackingCollections = await readJSONFile(process.env.FILE_PATH_LIST_TRACKING_COLL);
  console.log(`\n[!] Updated tracking collections successfully.`);
};
updateTrackingCollections();

/**
 * Get populate for list wallpapers
 */
const getPopulateData = async () => {
  let track_ids = [], providers = [], topics = [], styles = [], types = [];
  trackingCollections.filter((c) => c.collectionStatus==='tracked').map((t) => {
    if (!track_ids.includes(t.collectionId)) track_ids.push(t.collectionId);
    if (!providers.includes(t.collectionProvider)) providers.push(t.collectionProvider);
    if (!topics.includes(t.collectionTopic)) topics.push(t.collectionTopic);
    if (!styles.includes(t.collectionStyle)) styles.push(t.collectionStyle);
    if (!types.includes(t.collectionType)) types.push(t.collectionType);
  });
  return { track_ids, providers, topics, styles, types };
};

/**
 * Get list of wallpapers
 */
const getWallpapers = async (filter) => {
  let wallpapers = [];
  try {
    const { 
      provider = 'All', 
      topic = 'All', 
      style = 'All', 
      type = 'All', 
      track_id = 'All', 
      image_size 
    } = filter;
  
    console.log(`\n[!] List <${provider}> wallpapers starting...`);
    
    let filteredCollections = trackingCollections;
  
    if (provider !== 'All') {
      filteredCollections = filteredCollections.filter(c => c.collectionProvider === provider);
    }
    if (topic !== 'All') {
      console.log(`[!] - List <${provider}> wallpapers with topic: ${topic}`);
      filteredCollections = filteredCollections.filter(c => c.collectionTopic === topic);
    }
    if (style !== 'All') {
      console.log(`[!] - List <${provider}> wallpapers with style: ${style}`);
      filteredCollections = filteredCollections.filter(c => c.collectionStyle === style);
    }
    if (type !== 'All') {
      console.log(`[!] - List <${provider}> wallpapers with type: ${type}`);
      filteredCollections = filteredCollections.filter(c => c.collectionType === type);
    }
    if (track_id !== 'All') {
      console.log(`[!] - List <${provider}> wallpapers with track_id: ${track_id} (${typeof track_id})`);
      filteredCollections = filteredCollections.filter(c => c.collectionId === Number(track_id));
    }
  
    // Sort filteredCollections by created_at (or collectionId)
    if (filteredCollections.length > 1) filteredCollections = filteredCollections.sort((a, b) => b.collectionId - a.collectionId);
  
    // const filteredCollections = trackingCollections.filter(c =>
    //   (!collectionProvider || c.collectionProvider === collectionProvider) &&
    //   (!collectionTopic || c.collectionTopic === collectionTopic) &&
    //   (!collectionStyle || c.collectionStyle === collectionStyle)
    // );
  
    for (const collection of filteredCollections) {
      
      if (collection.collectionStatus !== 'tracked') continue;

      console.log(`[!] - List wallpapers for track-collection '${collection.collectionId}'`);
      
      let items = [];
      try {
        // Hanlding for collections type...
        if (collection.collectionType==='User_Collection' || collection.collectionType==='All') {
          const dirPath = `data/collections/${collection.collectionProvider}/collections/${collection.collectionTargetId}`;
          const files = await readDirectory(dirPath);
          console.log(`[!] - List wallpapers for track-collection '${collection.collectionId}' by collection type, has: ${files.length} colllections`);
          for (const file of files) {
            const itemsByCollections = await readJSONFile(`${dirPath}/${file}`);
            console.log(`[!] - List wallpapers for track-collection '${collection.collectionId}' by collection type, has: ${itemsByCollections.length} items`);
            // Filter with blacklist & image size...
            if (itemsByCollections && itemsByCollections.length > 0) items = [
              ...items, 
              ...itemsByCollections.filter(i => i.status && checkImageSize(i.banner.width,i.banner.height,image_size)).map((i) => ({
                id: i.id,
                image_url: i.banner.url,
                model_id: i.model_id,
                author_id: i.author_id,
                folder_no: i.folder_no,
                tracking_type: i.tracking_type,
                tracking_collection_id: i.tracking_collection_id,
              }))
            ];
          }
        }
        // Hanlding for works type...
        if (collection.collectionType==='User_Work' || collection.collectionType==='All') {
          const filePath = `data/collections/${collection.collectionProvider}/works/${collection.collectionTargetId}.json`;
          const itemsByWork = await readJSONFile(filePath);
          console.log(`[!] - List wallpapers for track-collection '${collection.collectionId}' by Work type, has: ${itemsByWork.length} items`);
          // Filter with blacklist...
          if (itemsByWork && itemsByWork.length > 0) items = [
            ...items, 
            ...itemsByWork.filter(i => i.status && checkImageSize(i.banner.width,i.banner.height,image_size)).map((i) => ({
              id: i.id,
              image_url: i.banner.url,
              model_id: i.model_id,
              author_id: i.author_id,
              folder_no: i.folder_no,
              tracking_type: i.tracking_type,
              tracking_collection_id: i.tracking_collection_id,
            }))
          ];
        }
    
        // Redis
        // const cacheKey = `collection:${collection.collectionTargetId}`;
        // let items = await redisClient.get(cacheKey);
        // In-memmory
        // if (!items) {
        //   const filePath = `data/collections/${collection.collectionProvider}-${collection.collectionTargetId}.json`;
        //   items = await fs.readFile(filePath);
        //   await redisClient.setEx(cacheKey, 3600, items);
        // }
        
        console.log(`[!] - List wallpapers for track-collection '${collection.collectionId}' success: ${items.length} items`);
    
        wallpapers = [...wallpapers, ...items];

        // Filter existed wallpapers
        await loadBlacklist();
        wallpapers = wallpapers.filter((w) => !(BLACKLIST_SET.has(w.id)));
        
      } catch (error) {
        console.error(`[x] - List wallpapers for track-collection '${collection.collectionId}' fail: ${error.message}`);
      }
    }
    console.log(`[!] - List wallpapers successfully: ${wallpapers.length} wallpapers`);
    
  } catch (error) {
    console.error(`[x] - List wallpapers error: ${error.message}`);
  }
  return wallpapers;
};

/**
 * Add wallpaper to blacklist
 */
const addToBlacklist = async (wallpaperId, collection_id, track_collection) => {

  console.log(`\n[!] Remove wallpaper has id: ${wallpaperId}`);

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
        return { ...w, status: false };
      } else {
        return w;
      }
    });
    await ensureJSONFileAndWrite(filePath, wallpapersUpdated);
  
    // Ad wallpaper into blacklist file...
    // const blacklist = await readJSONFile(process.env.FILE_PATH_BLACKLIST);
    // if (!blacklist.includes(wallpaperId)) {
    //   blacklist.push(wallpaperId);
    //   await ensureJSONFileAndWrite(process.env.FILE_PATH_BLACKLIST, blacklist);
    // }

    console.log(`[!] - Remove wallpaper has id ${wallpaperId} successfully.`);
    
  } catch (error) {
    console.error(`[x] - Remove wallpaper has id ${wallpaperId} failed: ${error.message}`);
  }
};

const checkImageSize = (width, height, image_size) => {
  const sizeValid = (width+height) >= (image_size.width+image_size.height);
  if (process.env.FILTER_BY_IMAGE_ASPECT_RATIO==='ENABLE') {
    // Support for 9:16 and 3:4
    return sizeValid && ((width/height) === 0.5625 || (width/height) === 0.75);
  }
  return sizeValid;
};

module.exports = { 
  getPopulateData, 
  updateTrackingCollections, 
  getWallpapers, 
  addToBlacklist
};

// nvhb thgnhvk ntthghkhhbb rdgkhmhj n