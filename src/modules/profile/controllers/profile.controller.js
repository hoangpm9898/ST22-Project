const { handleProfileResults } = require("../services/map-profile.service");
const { 
  getProfilesInfo, 
  getProfile,
  getImagesByProfileId,
  listProfiles,
  createProfile,
  deleteProfile,
  verifyProfile
} = require("../services/profile.service");
const { updateProfile, updateProfileDetail } = require("../services/update-profile.service");
const { uploadImageFile } = require("../services/upload-profile.service");

const get_profiles_info = async (req, res) => {
  try {
    const info = await getProfilesInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const get_profile = async (req, res) => {
  try {
    const { profileId } = req.params;
    const profile = await getProfile(profileId);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const get_profile_images = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { full } = req.query;
    const images = await getImagesByProfileId(profileId, full, false);
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const list_profiles = async (req, res) => {
  try {
    const profiles = await listProfiles();
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const create_profile = async (req, res) => {
  try {
    const { name, wallpaperIds } = req.body;
    const profile = await createProfile(name, wallpaperIds);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const delete_profile = async (req, res) => {
  try {
    const { profileId } = req.params;
    await deleteProfile(profileId);
    res.status(200).json({ message: "Profile deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verify_profile = async (req, res) => {
  try {
    const { profileId } = req.query;
    const data = await verifyProfile(profileId, 'NSFW');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const update_profile = async (req, res) => {
  try {
    const { typeHandler } = req.params;
    const { profileId, profileData, wallpapers } = req.body;
    const result = await updateProfile(typeHandler, profileId, profileData, wallpapers);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const update_profile_detail = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { profile } = req.body;
    const result = await updateProfileDetail(profile);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* -------------------------------------------------------------------------- */ 

const upload_image_file = async (req, res) => {
  try {
    const { profileId, fileType } = req.query;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const filePath = uploadImageFile(profileId, fileType, file);
    res.status(200).json({ success: true, filePath, message: "Upload has successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

/* -------------------------------------------------------------------------- */ 

const handle_profiles_result = async (req, res) => {
  try {
    const { resource, phaseNumber } = req.body;
    // Async process...
    handleProfileResults(resource, phaseNumber);
    res.status(200).json({ message: "Profiles has generating..." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* -------------------------------------------------------------------------- */ 

module.exports = {
  get_profiles_info, get_profile, get_profile_images,
  list_profiles, create_profile, delete_profile, update_profile, update_profile_detail,
  verify_profile,
  upload_image_file,
  handle_profiles_result
};