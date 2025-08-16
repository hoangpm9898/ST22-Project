const axios = require('axios');
const fs = require('fs').promises;

const { 
  delay,
  ensureJSONFileAndWrite,
  mergeJSONArrays,
  ensureDirectoryExists,
} = require('../../../utils/commonUtil');

const { Wallpaper } = require('../models/trackCollection');

const host = 'www.seaart.ai';
const dirAccItemsPath = `data/account-items`;

/**
 * 1. List post-items by tag (has code: 1)
 * @param {TrackCollection} collection
 */ 
const fetchItemsByTag = async (collection) => {

  let page = 1;
  let wallpapers = [];

  while (true) {
    const response = await axios.post(`https://${host}/api/v1/square/v3/artwork/list`, {
      page,
      page_size: 50,
      order_by: 'week_hot',
      offset: "",
      tag_ids: [collection.collectionTargetId],
      tag: collection.collectionTargetId,
      sub_channel: [],
      base_models: [],
    });

    if (!response.data || response.data.status.msg !== 'success') continue;
    
    const items = response.data.data.items.map(item => new Wallpaper({
      id: item.id,
      obj_type: item.obj_type,
      sub_obj_type: item.sub_obj_type,
      title: item.sub_title,
      cover: item.cover,
      //
      model_id: collection.collectionTargetId,
      prompt: null,
      local_prompt: null,
      banner: null,
      author_id: item.author.id,
      folder_no: null,
    }));
    if (items && items.length > 0) {
      wallpapers = wallpapers.concat(items);
    }
    page++;
    if (!response.data.data.has_more) break;
  }

  if (wallpapers.length > 0) {
    // Store this collection with wallpaper items
    const filePath = `data/collections/${collection.collectionProvider}/${collection.collectionId}-${collection.collectionTargetId}.json`;
    await fs.writeFile(filePath, JSON.stringify(wallpapers, null, 2));
  }
  return wallpapers;
};

/**
 * 2. List work-items by model (has code: 2)
 * @param {TrackCollection} collection
 */ 
const fetchItemsByModel = async (collection) => {

  let page = 1;
  let wallpapers = [];

  while (true) {
    const response = await axios.post(`https://${host}/api/v1/square/v3/artwork/list`, {
      page,
      page_size: 50,
      order_by: 'hot',
      artwork_types: [1,3,4,6,7],
      model_nos: collection.collectionTargetId,
      offset: ""
    });

    if (!response.data || response.data.status.msg !== 'success') continue;
    
    const items = response.data.data.items.map(item => new Wallpaper({
      id: item.id,
      obj_type: item.obj_type,
      sub_obj_type: item.sub_obj_type,
      title: item.sub_title,
      cover: item.cover,
      //
      model_id: collection.collectionTargetId,
      prompt: null,
      local_prompt: null,
      banner: null,
      author_id: item.author.id,
      folder_no: null,
    }));
    if (items && items.length > 0) {
      wallpapers = wallpapers.concat(items);
    }
    page++;
    if (!response.data.data.has_more) break;
  }

  if (wallpapers.length > 0) {
    // Store this collection with wallpaper items
    const filePath = `data/collections/${collection.collectionProvider}/${collection.collectionId}-${collection.collectionTargetId}.json`;
    await fs.writeFile(filePath, JSON.stringify(wallpapers, null, 2));
  }
  return wallpapers;
};

/**
 * 3. List work-items by account ()
 * - Store wallpapers with account ID: /data/collections/seaart.ai/works/1/cf12623f32fdf4037c567bc93337617a.json
 */ 
const fetchItemsByAccount = async (collection, accId) => {

  let page = 1;
  let wallpapers = [];

  const accountId = (accId) ? accId : collection.collectionTargetId;

  console.log(`\n[!] Fetch wallpapers from Account ID (${accountId})...`);

  try {
    let time_ms = 0;
    while (true) {
      console.log(`[!] - Fetch wallpapers for Account ID for page: ${page}`);
      try {
        const response = await axios.post(`https://${host}/api/v1/artwork/list`, {
          page,
          page_size: 35,
          type: 'bookmarks',
          order_by: 'hot',
          folder_no: 'default',
          keyword: '',
          start_at: 0,
          end_at: 0,
          after: time_ms,
          time_to: (time_ms!==0) ? time_ms : undefined,
          artwork_types: [],
          account_no: accountId,
          category: 2
        });
    
        if (
          !response.data || 
          response.data.status.msg !== 'success'
        ) continue;
    
        if (
          !response.data.data ||
          response.data.data.items.length === 0
        ) break;
        
        const items = response.data.data.items.map(item => new Wallpaper({
          id: item.id,
          model_id: item.model_id,
          prompt: item.prompt,
          local_prompt: item.local_prompt,
          banner: item.banner,
          author_id: item.author.id || accountId,
          folder_no: item.folder_no.collection_id,
          //
          obj_type: null,
          sub_obj_type: null,
          title: null,
          cover: null,
          //
          tracking_type: 'work',
          tracking_collection_id: collection.collectionId,
        }));
        if (items && items.length > 0) {
          console.log(`[!] - Fetch wallpapers for account ID (${accountId}) has: ${items.length} wallpapers`);
          // Add more 
          wallpapers = wallpapers.concat(items);
        }
        if (!response.data.data.has_more || items.length===50) break;
        time_ms = response.data.data.time_ms;
        page++;
        
      } catch (error) {
        console.error(`[x] - Fetch wallpapers from Account ID for page ${page} fail: ${error.message}`);
      }
      await delay(1000);
    }
  
    if (wallpapers.length > 0) {
      
      const filePath = `data/collections/${collection.collectionProvider}/works/${accountId}.json`;
  
      // Store litle wallpapers data (id, path, ...)
      const newItems = wallpapers.map((w) => ({ id: w.id, locationPath: filePath }));
      await mergeJSONArrays(`${dirAccItemsPath}/${accountId}.json`, newItems);
  
      // Store full wallpapers data
      await ensureJSONFileAndWrite(filePath, wallpapers);

      console.log(`[!] - Fetch wallpapers from Account ID success: ${wallpapers.length} wallpapers`);
  
    } else {
      console.error(`[x] - Fetch wallpapers from Account collections fail: Empty wallpapers`);
    }
  } catch (error) {
    console.error(`[x] - Fetch wallpapers from Account collections fail: ${error.message}`);
  }
  return wallpapers.length;
};

/**
 * 4.1. List collections by account ()
 */ 
const fetchCollectionsByAccount = async (collection) => {

  let wallpapersCount = 0;

  console.log(`\n[!] Fetch wallpapers from Account collections (${collection.collectionTargetId})...`);
  
  try {
    const response = await axios.post(`https://${host}/api/v1/account/collection`, {
      type: 1,
      other_id: collection.collectionTargetId, // Account ID
      category: 2
    });
  
    if (!response.data || response.data.status.msg !== 'success') {
      throw new Error('Invalid response from SeaArt.ai server');
    }
    
    const items = response.data.data.items;
    const cls = items.map(item => {
      const artwork_items = item.artwork_items.map((work) => ({
        id: work.id,
        banner: work.banner.url,
        banner_width: work.banner.width,
        banner_height: work.banner.height,
      }));
      return {
        id: item.id,
        name: `${collection.collectionId}-${item.name}`,
        category: item.category,
        artwork_items: artwork_items,
        //
        tracking_collection_id: collection.collectionId,
      };
    });

    if (cls && cls.length > 0) {

      const filePath = `data/collections/${collection.collectionProvider}/collections/${collection.collectionTargetId}.json`;
      await ensureJSONFileAndWrite(filePath, cls);

      // Fetch wallpapers...
      for (const cl of cls) {
        wallpapersCount += await fetchItemsByCollection(collection, cl.id);
        await delay(1000);
      }
      console.log(`[!] - Fetch wallpapers from Account collections success: ${cls.length} collections | ${wallpapersCount} wallpapers`);
    }
    else {
      throw new Error('Empty collections');
    }
  } catch (error) {
    console.error(`[x] - Fetch wallpapers from Account collections fail: ${error.message}`);
  }
  return wallpapersCount;
};

/**
 * 4.2. List work-items by collection ()
 * - Store wallpapers with account collection: /data/collections/seaart.ai/collections/1/1-63306442931714053.json
 */ 
const fetchItemsByCollection = async (collection, collectionId) => {

  let page = 1;
  let wallpapers = [];

  const accountId = collection.collectionTargetId;

  let time_ms = 0;
  while (true) {
    try {
      const response = await axios.post(`https://${host}/api/v1/artwork/list/other`, {
        page,
        page_size: 60,
        type: 'bookmarks',
        folder_no: collectionId,
        keyword: '',
        start_at: 0,
        end_at: 0,
        after: time_ms,
        time_to: (time_ms!==0) ? time_ms : undefined,
        artwork_types: [],
        account_no: accountId,
        category: 2
      });
      if (!response.data || response.data.status.msg !== 'success') continue;
    
      const items = response.data.data.items;

      if (!items) {
        page--;
        break;
      }

      const itms = items.map(item => new Wallpaper({
        id: item.id,
        model_id: item.model_id,
        prompt: item.prompt,
        local_prompt: item.local_prompt,
        banner: item.banner,
        author_id: item.author.id || accountId,
        folder_no: item.folder_no.collection_id,
        //
        obj_type: null,
        sub_obj_type: null,
        title: null,
        cover: null,
        //
        tracking_type: 'collection',
        tracking_collection_id: collection.collectionId,
      }));

      if (itms && itms.length > 0) {
        wallpapers = wallpapers.concat(itms);
      }
      if (!response.data.data.has_more || itms.length===50) break;
      time_ms = response.data.data.time_ms;
      page++;
      
    } catch (error) {}
  }

  if (wallpapers.length > 0) {

    console.log(`[!] - Fetch wallpapers for account-collection (${collectionId}) success (with ${page} pages): ${wallpapers.length} wallpapers`);

    const dirPath = `data/collections/${collection.collectionProvider}/collections/${accountId}`;
    const filePath = `${dirPath}/${collectionId}.json`;

    // Store litle wallpapers data (id, path, ...)
    const newItems = wallpapers.map((w) => ({ id: w.id, locationPath: filePath }));
    await mergeJSONArrays(`${dirAccItemsPath}/${accountId}.json`, newItems);

    // Store full wallpapers data
    await ensureDirectoryExists(dirPath);
    await ensureJSONFileAndWrite(filePath, wallpapers);
  }
  return wallpapers.length;
};

module.exports = { 
  fetchItemsByTag, 
  fetchItemsByModel, 
  fetchItemsByAccount,
  fetchCollectionsByAccount
};