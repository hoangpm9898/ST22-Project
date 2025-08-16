const { getAppAlbumsByTag, getAppAlbumsByCategory, getAppCategories, getAppTags, getAppTagsActive, getSingleAlbum } = require("../services/appServices");
const { verifyAllUrls } = require("../services/verifyService");

const get_app_categories = async (req, res) => {
  try {
    const categories = await getAppCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const get_app_tags = async (req, res) => {
  try {
    const tags = await getAppTags();
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const get_app_tags_active = async (req, res) => {
  try {
    const tags = await getAppTagsActive();
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const get_single_album = async (req, res) => {
  try {
    const album = await getSingleAlbum();
    res.json(album);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const list_albums_by_category = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page, limit } = req.query;
    const response = await getAppAlbumsByCategory(categoryId, Number(page), Number(limit));
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const list_albums_by_tag = async (req, res) => {
  try {
    const { tagId } = req.params;
    const { page, limit } = req.query;
    const response = await getAppAlbumsByTag(tagId, Number(page), Number(limit));
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const verify_invalid_links = async (req, res) => {
  try {
    const { typeVerify } = req.query;
    const verificationResults = await verifyAllUrls(typeVerify);
    res.json(verificationResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { 
  get_app_categories, get_app_tags, get_app_tags_active,
  get_single_album, list_albums_by_category, list_albums_by_tag,
  verify_invalid_links
};