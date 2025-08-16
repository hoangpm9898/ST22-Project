const { getWallpapers, addToBlacklist, getPopulateData } = require('../services/managementService');

const listPopulateData = async (req, res) => {
  try {
    const populateData = await getPopulateData();
    res.json({ status: 'success', data: populateData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const listWallpapers = async (req, res) => {
  try {
    // {
    //   "page": 1,
    //   "page_size": 100,
    //   "filter": {
    //     "track_id": 1,
    //     "provider": "seaart.ai",
    //     "topic": "All",
    //     "style": "All",
    //     "type": "User_Collection",
    //     "image_size": {
    //       "width": "720",
    //       "height": "1280",
    //     }
    //   }
    // }
    const { page, page_size, filter } = req.body;

    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(page_size, 10);

    let parsedFilter;
    try {
      parsedFilter = typeof filter === 'string' ? JSON.parse(filter) : filter;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid filter format' });
    }

    // Get list of wallpapers...
    const wallpapers = await getWallpapers(parsedFilter);

    const totalItems = wallpapers.length;
    const totalPages = Math.ceil(totalItems / pageSizeNum);
    const startIndex = (pageNum - 1) * pageSizeNum;
    const endIndex = startIndex + pageSizeNum;
    const paginatedCollections = wallpapers.slice(startIndex, endIndex);

    res.status(200).json({
      data: paginatedCollections,
      pagination: {
        page: pageNum,
        page_size: pageSizeNum,
        total_items: totalItems,
        total_pages: totalPages,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteWallpaper = async (req, res) => {
  try {
    // {
    //   "id": "xxxx",                 // Wallpaper ID
    //   "collection_id": "xxxx",      // Collection ID of wallpaper (only valid with data type is 'User_Collection')
    //   "track_collection": {
    //     "id": 1,                    // Track Collection ID (ex: 1, 2, 3, ...)
    //     "targetId": "xxxx",         // Account or Model ID
    //     "provider": "seaart.ai",
    //     "type": "User_Collection",
    //   }
    // }
    const { id, collection_id, track_collection, action_type } = req.body;
    
    // Add wallpaper to blacklist...
    await addToBlacklist(id, collection_id, track_collection);
    res.json({ status: 'success', message: `Wallpaper ${id} added to blacklist` });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { listPopulateData, listWallpapers, deleteWallpaper };