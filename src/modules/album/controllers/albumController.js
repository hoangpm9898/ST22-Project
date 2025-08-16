const { 
  updateAlbum, createAlbum, listAlbums, getAlbum, deleteAlbum, getImagesByAlbumId, 
  getCategories, getTags, verifyAlbum, getAlbumsInfo,
  handleAlbumResults,
  handleCategoriesAndTagsResults
} = require("../services/albumService");

const { pushMissWallpapers } = require("../services/fixService");

const get_categories = async (req, res) => {
  try {
    const categories = await getCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const get_tags = async (req, res) => {
  try {
    const tags = await getTags();
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const get_albums_info = async (req, res) => {
  try {
    const info = await getAlbumsInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const get_album = async (req, res) => {
  try {
    const { albumId } = req.params;
    const album = await getAlbum(albumId);
    res.json(album);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const get_images = async (req, res) => {
  try {
    const { albumId } = req.params;
    const { full } = req.query;
    const images = await getImagesByAlbumId(albumId, full, false);
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const list_albums = async (req, res) => {
  try {
    const albums = await listAlbums();
    res.json(albums);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const create_album = async (req, res) => {
  try {
    const { albumName, wallpaperIds } = req.body;
    const album = await createAlbum(albumName, wallpaperIds);
    res.json(album);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const update_album = async (req, res) => {
  try {
    const { typeHandler } = req.params;
    const { albumId, albumData, wallpapers } = req.body;
    const result = await updateAlbum(typeHandler, albumId, albumData, wallpapers);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const delete_album = async (req, res) => {
  try {
    const { albumId } = req.params;
    await deleteAlbum(albumId);
    res.status(200).json({ message: "Album deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verify_album = async (req, res) => {
  try {
    const { albumId } = req.query;
    const data = await verifyAlbum(albumId, 'NSFW');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* -------------------------------------------------------------------------- */ 

const handle_albums_result = async (req, res) => {
  try {
    const { resource, phaseNumber } = req.body;
    // Async process...
    handleAlbumResults(resource, phaseNumber);
    res.status(200).json({ message: "Albums has generating..." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const handle_categories_and_tags_result = async (req, res) => {
  try {
    const { resource } = req.body;
    // Async process...
    handleCategoriesAndTagsResults(resource);
    res.status(200).json({ message: "Categories & Tags has generating..." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const push_missing_wallpapers = async (req, res) => {
  try {
    const { resource, albumId, wallpaperIds } = req.body;
    await pushMissWallpapers(resource, albumId, wallpaperIds);
    res.status(200).json({ message: "Push missing wallpapers sucessfully!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* -------------------------------------------------------------------------- */ 

module.exports = { 
  get_categories, get_tags, get_albums_info, 
  get_album, get_images, list_albums, create_album, update_album, delete_album, 
  verify_album,
  handle_albums_result, handle_categories_and_tags_result, push_missing_wallpapers
};