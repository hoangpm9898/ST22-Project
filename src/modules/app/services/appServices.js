
const { AppResponse, AppResponsePagination } = require("../models/appModels");
const { getAppAlbumsByCategoryID, getAppAlbumsByTagID, getAllAppCategories, getAllAppTags, getRandomAlbum } = require("../repositories/appRepositories");

/* -------------------------------------------------------------------------- */

// Get categories
const getAppCategories = async () => {
  try {
    console.log(`\n[!] Get all categories`);
    let categories = [];
    for (const category of getAllAppCategories()) {
      if (category.id===Number(process.env.CTG_FORYOU_ID) || (await getAppAlbumsByCategoryID(category.id)).length>0) {
        categories.push(category);
      }
    }
    console.log(`[!] - Get all categories success, has ${categories.length} categories`);
    return categories;
  } catch (error) {
    console.log(`[x] - Get all categories error: ${error.message}`);
  }
};

// Get tags
const getAppTags = async () => {
  try {
    console.log(`\n[!] Get all tags`);
    let tags = [];
    for (const tag of getAllAppTags()) {
      if ((await getAppAlbumsByTagID(tag.id)).length>0) {
        tags.push(tag);
      }
    }
    console.log(`[!] - Get all tags success, has ${tags.length} tags`);
    return tags;
  } catch (error) {
    console.log(`[x] - Get all tags error: ${error.message}`);
  }
};
const getAppTagsActive = async () => {
  try {
    let info = [];
    for (const tag of getAllAppTags()) {
      const totalAlbums = (await getAppAlbumsByTagID(tag.id)).length;
      if (totalAlbums > 0) {
        info.push({ name: tag.name, total: totalAlbums });
      }
    }
    return info;
  } catch (error) {}
};

/* -------------------------------------------------------------------------- */

// Get random single album
const getSingleAlbum = () => {
  return getRandomAlbum();
};

// Get albums by category
const getAppAlbumsByCategory = async (categoryId, page = 1, limit = 20) => {
  try {
    console.log(`\n[!] Get list albums by category: ${categoryId}`);

    let albums; 
    if (Number(categoryId)===Number(process.env.CTG_FORYOU_ID)) {
      albums = await getAppAlbumsByCategoryID(categoryId, true);
    } else {
      albums = await getAppAlbumsByCategoryID(categoryId);
    }

    console.log(`[!] - Get list albums by category success, has ${albums.length} albums`);

    const totalRecords = albums.length;
    const totalPages = Math.ceil(totalRecords / limit);

    if (page > totalPages && totalRecords > 0) {
      return new AppResponse({
        success: true,
        data: [],
        pagination: new AppResponsePagination({
          has_next: false,
          per_page: limit,
          current_page: page,
          total_pages: totalPages,
          total_records: totalRecords
        })
      });
    }
    const startIndex = (page-1) * limit;
    const endIndex = Math.min(startIndex + limit, totalRecords);
    
    const paginatedData = albums.slice(startIndex, endIndex);
    
    const pagination = new AppResponsePagination({
      has_next: page < totalPages,
      per_page: limit,
      current_page: page,
      total_pages: totalPages,
      total_records: totalRecords
    });

    const response = new AppResponse({
      success: true,
      data: paginatedData,
      pagination: pagination
    });

    return response;

  } catch (error) {
    console.log(`[x] - Get all categories error: ${error.message}`);
    return new AppResponse({
      success: false,
      data: null,
      pagination: null
    });
  }
};

// Get albums by tag
const getAppAlbumsByTag = async (tagId, page = 1, limit = 20) => {
  try {
    console.log(`\n[!] Get list albums by category: ${tagId}`);

    const albums = await getAppAlbumsByTagID(tagId);

    console.log(`[!] - Get list albums by tag success, has ${albums.length} albums`);

    const totalRecords = albums.length;
    const totalPages = Math.ceil(totalRecords / limit);

    if (page > totalPages && totalRecords > 0) {
      return new AppResponse({
        success: true,
        data: [],
        pagination: new AppResponsePagination({
          has_next: false,
          per_page: limit,
          current_page: page,
          total_pages: totalPages,
          total_records: totalRecords
        })
      });
    }
    const startIndex = (page-1) * limit;
    const endIndex = Math.min(startIndex + limit, totalRecords);
    
    const paginatedData = albums.slice(startIndex, endIndex);
    
    const pagination = new AppResponsePagination({
      has_next: page < totalPages,
      per_page: limit,
      current_page: page,
      total_pages: totalPages,
      total_records: totalRecords
    });

    const response = new AppResponse({
      success: true,
      data: paginatedData,
      pagination: pagination
    });

    return response;

  } catch (error) {
    console.log(`[x] - Get all tags error: ${error.message}`);
    return new AppResponse({
      success: false,
      data: null,
      pagination: null
    });
  }
};

/* -------------------------------------------------------------------------- */

module.exports = { 
  getAppCategories, getAppTags, getAppTagsActive,
  getSingleAlbum, getAppAlbumsByCategory, getAppAlbumsByTag
};