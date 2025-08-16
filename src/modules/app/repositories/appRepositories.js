const { getRandomIdx } = require('../../../utils/commonUtil');

const fs = require('fs').promises;

const APP_RESULT_DIR = process.env.APP_RESULTS_PATH;

/* -------------------------------------------------------------------------- */ 

let ALL_APP_COUNTRIES = [];
const loadAppCountries = async () => {
  ALL_APP_COUNTRIES = JSON.parse(await fs.readFile(`${APP_RESULT_DIR}/countries.json`, 'utf8'));
};
const updateAppCountries = async (countries) => {
  await fs.writeFile(`${APP_RESULT_DIR}/countries.json`, JSON.stringify(countries,null,2));
  await loadAppCountries();
};
loadAppCountries().then(() => {
  console.log(`\n[!] Loaded ${ALL_APP_COUNTRIES.length} countries initially for App`);
});

/* -------------------------------------------------------------------------- */ 

let ALL_APP_TAGS = [];
const loadAppTags = async () => {
  ALL_APP_TAGS = JSON.parse(await fs.readFile(`${APP_RESULT_DIR}/tags.json`, 'utf8'));
};
const updateAppTags = async (tags) => {
  await fs.writeFile(`${APP_RESULT_DIR}/tags.json`, JSON.stringify(tags,null,2));
  await loadAppTags();
};
loadAppTags().then(() => {
  console.log(`\n[!] Loaded ${ALL_APP_TAGS.length} tags initially for App`);
});

/* -------------------------------------------------------------------------- */ 

let ALL_APP_CATEGORIES = [];
const loadAppCategories = async () => {
  ALL_APP_CATEGORIES = JSON.parse(await fs.readFile(`${APP_RESULT_DIR}/categories.json`, 'utf8'));
};
const updateAppCategories = async (categories) => {
  await fs.writeFile(`${APP_RESULT_DIR}/categories.json`, JSON.stringify(categories,null,2));
  await loadAppCategories();
};
loadAppCategories().then(() => {
  console.log(`\n[!] Loaded ${ALL_APP_CATEGORIES.length} categories initially for App`);
});

/* -------------------------------------------------------------------------- */ 

let ALL_APP_ALBUMS = [];
const loadAppAlbums = async () => {
  ALL_APP_ALBUMS = JSON.parse(await fs.readFile(`${APP_RESULT_DIR}/albums.json`, 'utf8'));
};
const updateAppAlbums = async (albums) => {
  await fs.writeFile(`${APP_RESULT_DIR}/albums.json`, JSON.stringify(albums,null,2));
  await loadAppAlbums();
};
loadAppAlbums().then(() => {
  console.log(`\n[!] Loaded ${ALL_APP_ALBUMS.length} albums initially for App`);
});

/* -------------------------------------------------------------------------- */ 
/*                 Get list of App albums, categories, tags                   */
/* -------------------------------------------------------------------------- */

// Get categories
const getAllAppCategories = () => {
  return ALL_APP_CATEGORIES;
};

// Get tags
const getAllAppTags = () => {
  return ALL_APP_TAGS;
};

// Get countries
const getAllAppCountries = () => {
  return ALL_APP_COUNTRIES;
};

// Get albums
const getAllAppAlbums = () => {
  return ALL_APP_ALBUMS;
};

/* -------------------------------------------------------------------------- */ 
/*               Get list of App albums by category & tag ID                  */
/* -------------------------------------------------------------------------- */

// Get random single album
const getRandomAlbum = () => {
  const idx = getRandomIdx(ALL_APP_ALBUMS);
  return ALL_APP_ALBUMS[idx];
};

// Get albums by category
const getAppAlbumsByCategoryID = async (categoryId, getAllAlbums=false) => {
  if (getAllAlbums) {
    return ALL_APP_ALBUMS;
  }
  return ALL_APP_ALBUMS.filter((album) => album.categoryId === Number(categoryId));
};

// get albums by tag
const getAppAlbumsByTagID = async (tagId) => {
  const tagName = ALL_APP_TAGS.find((tag) => tag.id === Number(tagId)).name;
  return ALL_APP_ALBUMS.filter((album) => album.tags.includes(tagName));
};

/* -------------------------------------------------------------------------- */

module.exports = { 
  updateAppTags, updateAppCategories, updateAppAlbums, updateAppCountries,
  getAllAppCategories, getAllAppTags, getAllAppAlbums, getAllAppCountries,
  getAppAlbumsByCategoryID, getAppAlbumsByTagID,
  getRandomAlbum
};