const express = require('express');
const multer = require('multer');
const { syncCollections } = require('../modules/collection/controllers/collectionController');
const { listWallpapers, deleteWallpaper, listPopulateData } = require('../modules/management/controllers/managementController');
const { 
  list_albums, get_album, create_album, update_album, delete_album, 
  get_images, get_categories, get_tags, verify_album, get_albums_info, 
  handle_categories_and_tags_result, handle_albums_result,
  push_missing_wallpapers 
} = require('../modules/album/controllers/albumController');
const {
  get_profiles_info, get_profile, get_profile_images,
  list_profiles, create_profile, delete_profile, update_profile,
  verify_profile,
  handle_profiles_result,
  upload_image_file,
  update_profile_detail
} = require('../modules/profile/controllers/profile.controller');
const { 
  get_app_categories, 
  get_app_tags, 
  list_albums_by_tag, list_albums_by_category, 
  verify_invalid_links, 
  get_app_tags_active, 
  get_single_album
} = require('../modules/app/controllers/appControllers');

/* -------------------------------------------------------------------------- */ 

// Configure multer for file upload
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF formats are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/* -------------------------------------------------------------------------- */ 

const router = express.Router();

// Common routes
router.get('/health', (req, res) => {
  res.status(200).send('OK');
});

/* ************************************************************************************************ */ 
// Home Dashboard: Quản lý list wallpapers
// ---------------------------------------------------------------------------------------------------
// Method	  Endpoint	                    Description
// ---------------------------------------------------------------------------------------------------
// POST	    /api/collections/sync	        Đồng bộ collections từ Google Sheet
// GET	    /api/wallpapers	              Lấy danh sách wallpapers theo các bộ lọc
// POST	    /api/wallpapers/delete	      Thêm wallpaper vào blacklist (hidden khỏi Home dashboard)
// ...
/* ************************************************************************************************ */ 

// Collection routes
router.post('/track-collections/sync', syncCollections);

// Management routes
router.post('/wallpapers', listWallpapers);
router.get('/wallpapers/populate', listPopulateData);
router.post('/wallpapers/delete', deleteWallpaper);
router.get('/hashtags-active', get_app_tags_active);

/* ************************************************************************************************ */ 
// Album Dashboard: Quản lý Album wallpapers
// ---------------------------------------------------------------------------------------------------
// Method	  Endpoint	                    Description
// ---------------------------------------------------------------------------------------------------
// GET	    /api/albums	                  Lấy danh sách albums đã tạo
// GET	    /api/albums/:albumId	        Lấy data của 1 album cụ thể
// GET	    /api/albums/:albumId/images	  Lấy image data của 1 album cụ thể (lấy trực tiếp từ Resource)
// ...
// GET      /api/album/verify             Quét nội dung NSFW của album images
// ...
/* ************************************************************************************************ */ 

// Album routes
router.get('/albums', list_albums);
router.get('/albums/:albumId', get_album);
router.get('/albums/:albumId/images', get_images);
router.post('/albums', create_album);
router.post('/albums/:typeHandler', update_album);
router.delete('/albums/:albumId', delete_album);
// Album routes (more)
router.get('/album/tags', get_tags);
router.get('/album/categories', get_categories);
router.get('/album/info', get_albums_info);
router.get('/album/verify', verify_album);

/* ************************************************************************************************ */ 
// Profile Dashboard: Quản lý Profile wallpapers
// ---------------------------------------------------------------------------------------------------
// Method	  Endpoint	                      Description
// ---------------------------------------------------------------------------------------------------
// GET	    /api/profiles	                  Lấy danh sách albums đã tạo
// GET	    /api/profiles/:profileId	      Lấy data của 1 album cụ thể
// GET	    /api/profiles/:profileId/images	Lấy image data của 1 album cụ thể (lấy trực tiếp từ Resource)
// ...
// GET      /api/profile/verify             Quét nội dung NSFW của album images
// POST     /api/profile/upload-image       Upload avatar & background image cho Profile
// ...
/* ************************************************************************************************ */ 

// Profile routes
router.get('/profiles', list_profiles);
router.get('/profiles/:profileId', get_profile);
router.get('/profiles/:profileId/images', get_profile_images);
router.post('/profiles', create_profile);
router.post('/profiles/:typeHandler', update_profile);
router.put('/profiles/:profileId', update_profile_detail);
router.delete('/profiles/:profileId', delete_profile);
// Profile routes (more)
router.get('/profile/info', get_profiles_info);
router.get('/profile/verify', verify_profile);
// Upload avatar & background of profile
router.post('/profile/upload-image', upload.single('image'), upload_image_file);

/* ************************************************************************************************ */ 
// App Backend: Data standardization (Chuẩn hoá data từ album & profile được tạo trong Dashboard)
// ---------------------------------------------------------------------------------------------------
// Method	  Endpoint	                            Description
// ---------------------------------------------------------------------------------------------------
// GET	    /api/albums-result	                  Chuẩn hoá list albums data
// GET	    /api/profiles-result	                Chuẩn hoá list profiles data
// GET	    /api/categories-tags-result	          Chuẩn hoá list categories & hashtags data
/* ************************************************************************************************ */ 

// App data standardization routes
router.post('/albums-result', handle_albums_result);
router.post('/profiles-result', handle_profiles_result);
router.post('/categories-tags-result', handle_categories_and_tags_result);
router.post('/push-missing', push_missing_wallpapers);

/* ************************************************************************************************ */ 
// App Backend: Album Data
// ---------------------------------------------------------------------------------------------------
// Method	  Endpoint	                            Description
// ---------------------------------------------------------------------------------------------------
// GET	    /api/categories	                      Lấy danh sách album categories
// GET	    /api/hashtags	                        Lấy danh sách album hashtags
// GET	    /api/album	                          Lấy radom 1 album trong list
// GET      /api/categories/:categoryId/albums    Lấy danh sách album theo category ID
// POST     /api/hashtags/:tagId/albums           Lấy danh sách album theo hashtag ID
/* ************************************************************************************************ */ 

// App routes
router.get('/categories', get_app_categories);
router.get('/hashtags', get_app_tags);
router.get('/album', get_single_album);
router.get('/categories/:categoryId/albums', list_albums_by_category);
router.get('/hashtags/:tagId/albums', list_albums_by_tag);

// Verity invalid links
router.get('/verify/invalid-links', verify_invalid_links);

module.exports = router;