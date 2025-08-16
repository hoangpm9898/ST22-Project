const path = require('path');
const fs = require('fs').promises;

// Main upload function
const uploadImageFile = async (profileId, fileType, file) => {
  try {
    console.log(`\n[!] Upload ${fileType} of profile: ${profileId}`);
    // Validate inputs
    if (!profileId || !fileType || !file) {
      throw new Error('Missing required parameters');
    }
    // Generate unique filename
    const filePath = path.join('data', 'profiles', 'uploads', `${profileId}-${fileType}-${Date.now()}.webp`);
    // Save file (async)
    fs.writeFile(filePath, file.buffer);
    // Return relative path for client use
    return filePath;
  }
  catch (error) {
    console.error(`[x] Upload ${fileType} of profile fail: ${error.message}`);
    throw new Error(`Upload failed: ${error.message}`);
  }
};

module.exports = { uploadImageFile };