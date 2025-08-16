const path = require('path');
const fs = require('fs').promises;

const { Category, Album, AlbumWallpaper } = require('../models/album');

/* -------------------------------------------------------------------------- */ 

let ALL_COUNTRIES = [];
const loadAllCountries = async () => {
  const countries = JSON.parse(await fs.readFile('data/albums/countries.json', 'utf8'));
  ALL_COUNTRIES = countries.map(country => new Category(country));
};
const updateAllCountries = async (countries) => {
  await fs.writeFile('data/albums/countries.json', JSON.stringify(countries,null,2));
  await loadAllCountries();
};
loadAllCountries().then(() => {
  console.log(`\n[!] Loaded ${ALL_COUNTRIES.length} countries initially`);
});

/* -------------------------------------------------------------------------- */ 

let ALL_TAGS = [];
const loadAllTags = async () => {
  const tags = JSON.parse(await fs.readFile('data/albums/tags.json', 'utf8'));
  ALL_TAGS = tags.map(tag => new Category(tag));
};
const updateAllTags = async (tags) => {
  await fs.writeFile('data/albums/tags.json', JSON.stringify(tags,null,2));
  await loadAllTags();
};
loadAllTags().then(() => {
  console.log(`\n[!] Loaded ${ALL_TAGS.length} tags initially`);
});

/* -------------------------------------------------------------------------- */ 

let ALL_CATEGORIES = [];
const loadAllCategories = async () => {
  const categories = JSON.parse(await fs.readFile('data/albums/categories.json', 'utf8'));
  ALL_CATEGORIES = categories.map(ctg => new Category(ctg));
};
const updateAllCategories = async (categories) => {
  await fs.writeFile('data/albums/categories.json', JSON.stringify(categories,null,2));
  await loadAllCategories();
};
loadAllCategories().then(() => {
  console.log(`\n[!] Loaded ${ALL_CATEGORIES.length} categories initially`);
});

/* -------------------------------------------------------------------------- */ 

let ALL_WALLPAPERS = [];
let ALL_WALLPAPER_ID_SET = [];
const loadAllWallpapers = async () => {
  const wallpapers = JSON.parse(await fs.readFile(process.env.WALLPAPERS_PATH, 'utf8'));
  ALL_WALLPAPERS = wallpapers.map(wallpaper => new AlbumWallpaper(wallpaper));
  ALL_WALLPAPER_ID_SET = new Set(ALL_WALLPAPERS.map(w => w.id));
};
const updateAllWallpapers = async (wallpapers) => {
  await fs.writeFile(process.env.WALLPAPERS_PATH, JSON.stringify(wallpapers,null,2));
  await loadAllWallpapers();
};
loadAllWallpapers().then(() => {
  console.log(`\n[!] Loaded ${ALL_WALLPAPERS.length} wallpapers initially`);
});

/* -------------------------------------------------------------------------- */ 

let ALL_ALBUMS = [];
const loadAllAlbums = async () => {
  const albums = JSON.parse(await fs.readFile(process.env.ALBUMS_PATH, 'utf8'));
  ALL_ALBUMS = albums.map(album => new Album(album));
};
const updateAllAlbums = async (albums) => {
  await fs.writeFile(process.env.ALBUMS_PATH, JSON.stringify(albums,null,2));
  await loadAllAlbums();
};
loadAllAlbums().then(() => {
  console.log(`\n[!] Loaded ${ALL_ALBUMS.length} albums initially`);
});

/* -------------------------------------------------------------------------- */ 
/*          Get list of App albums, wallpapers, categories, tags              */
/* -------------------------------------------------------------------------- */

// Get categories
const getAllCategories = () => {
  return ALL_CATEGORIES;
};

// Get tags
const getAllTags = () => {
  return ALL_TAGS;
};

// Get countries
const getAllCountries = () => {
  return ALL_COUNTRIES;
};

// Get wallpapers
const getAllWallpapers = () => {
  return ALL_WALLPAPERS;
};
// Get wallpaper Ids
const getAllWallpaperIds = () => {
  return ALL_WALLPAPER_ID_SET;
};

// Get albums
const getAllAlbums = () => {
  return ALL_ALBUMS;
};

// Get wallpapers by album ID
const getListWallpapersByAlbumId = (album, getFullFields, getHighQualityUrl, customWallpaperIds) => {
  let wallpapaperUrls;
  // For add new wallpapers after mapping process...
  if (customWallpaperIds && customWallpaperIds.length > 0) {
    wallpapaperUrls = ALL_WALLPAPERS
      .filter(wallpaper => album.wallpaperIds.includes(wallpaper.id));
    return wallpapaperUrls;
  }
  // For:
  // - Get wallpapers with dashboard request
  // - Add new wallpapers on mapping process
  if (getFullFields) {
    wallpapaperUrls = ALL_WALLPAPERS
      .filter(wallpaper => album.wallpaperIds.includes(wallpaper.id));
  } else {
    wallpapaperUrls = ALL_WALLPAPERS
      .filter(wallpaper => album.wallpaperIds.includes(wallpaper.id))
      .map((wallpaper) => (getHighQualityUrl) ? wallpaper.url : wallpaper.preview_url);
  }
  return wallpapaperUrls;
}

/* -------------------------------------------------------------------------- */ 

module.exports = { 
  loadAllCategories, updateAllCategories, getAllCategories,
  loadAllTags, updateAllTags, getAllTags,
  loadAllCountries, updateAllCountries, getAllCountries,
  loadAllWallpapers, updateAllWallpapers, getAllWallpapers, getAllWallpaperIds, getListWallpapersByAlbumId,
  loadAllAlbums, updateAllAlbums, getAllAlbums,
};