const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const delay = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const getMaxId = (listIds) => {
  return Math.max(...listIds);
}

const getRandomIdx = (array) => {
  return Math.floor(Math.random() * array.length);
}

const replaceWallpaperIdFromLink = (url, wallpaperId) => {
  const regex = /\/([^\/]+)\.webp$/;
  return (regex.test(url)) ? url.replace(regex, `/${wallpaperId}.webp`) : url;
}
const getWallpaperIdFromLink = (url) => {
  const regex = /\/([^\/]+)\.webp$/;
  const match = url.match(regex);
  return match ? match[1] : null; // Trả về wallpaperId nếu khớp
};

// Fisher-Yates Shuffle
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const ensureDirectoryExists = async (dirPath) => {
  const absolutePath = path.resolve(dirPath);
  try {
    await fs.access(absolutePath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

const readDirectory = async (dirPath) => {
  await ensureDirectoryExists(dirPath);
  try {
    return fs.readdir(dirPath);
  } catch (error) {
    console.error(`[x] - Error reading folder [${dirPath}]: ${error.message}`);
  }
  return [];
}

const readJSONFile = async (filePath) => {
  try {
    const absolutePath = path.resolve(filePath);
    try {
      await fs.access(absolutePath);
    } catch {
      await fs.writeFile(absolutePath, JSON.stringify([]));
    }
    const fileContent = await fs.readFile(absolutePath, 'utf8');
    if (!fileContent.trim()) return [];
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`[x] - Error reading JSON file [${filePath}]: ${error.message}`);
  }
  return [];
}

const ensureJSONFileAndWrite = async (filePath, data) => {
  try {
    const absolutePath = path.resolve(filePath);
    try {
      await fs.access(absolutePath);
    } catch {
      await fs.writeFile(absolutePath, JSON.stringify([]));
    }
    await fs.writeFile(absolutePath, JSON.stringify(data,null,2));
  } catch (error) {
    console.error(`[x] - Error writting JSON file [${filePath}]: ${error.message}`);
  }
}

const mergeJSONArrays = async (filePath, newArray) => {
  try {
    const map = new Map();
    const array = await readJSONFile(filePath);
    array.forEach(item => map.set(item.id, item));
    newArray.forEach(item => map.set(item.id, item));
    await ensureJSONFileAndWrite(filePath, Array.from(map.values()));
  } catch (error) {
    console.error(`[x] - Error merge data in JSON file [${filePath}]: ${error.message}`);
  }
}

async function cropImage(inputPath, outputPath) {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    const targetRatio = 9/16;
    const currentRatio = metadata.width / metadata.height;

    let newWidth, newHeight;

    if (currentRatio > targetRatio) {
      newWidth = Math.floor(metadata.height * targetRatio);
      newHeight = metadata.height;
    } else {
      newWidth = metadata.width;
      newHeight = Math.floor(metadata.width / targetRatio);
    }

    await image
      .extract({
        left: Math.floor((metadata.width-newWidth)/2),
        top: Math.floor((metadata.height-newHeight)/2),
        width: newWidth,
        height: newHeight,
      })
      .toFile(outputPath);

    console.log(`[!] - The image has been cropped and saved in: ${outputPath}`);
    return true;

  } catch (error) {
    console.error('[x] - Error when cropping image:', error);
  }
  return false;
}

async function cropImageLink(inputUrl, outputPath) {
  try {
    // Fetch the image from the URL
    const response = await axios.get(inputUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);

    // Load the image into sharp from the buffer
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    const targetRatio = 9 / 16;
    const currentRatio = metadata.width / metadata.height;

    let newWidth, newHeight;

    if (currentRatio > targetRatio) {
      newWidth = Math.floor(metadata.height * targetRatio);
      newHeight = metadata.height;
    } else {
      newWidth = metadata.width;
      newHeight = Math.floor(metadata.width / targetRatio);
    }

    await image
      .extract({
        left: Math.floor((metadata.width - newWidth) / 2),
        top: Math.floor((metadata.height - newHeight) / 2),
        width: newWidth,
        height: newHeight,
      })
      .toFile(outputPath);
    return true;

  } catch (error) {
    console.error('[x] - Error when cropping image:', error);
    return false;
  }
}

// Get image link has high quality
const getHighImageUrl = async (provider, wallpaperId) => {
  try {
    if (provider==='seaart.ai') {
      const response = await fetch(`https://www.seaart.ai/api/v1/artwork/detail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: wallpaperId,
        }, null, 2)
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      if (result && result.data) {
        console.log('[!] - Get high quality wallpaper successfully');
        return result.data.banner.url;
      }
    }
  } catch (error) {}
}

const convertToWebp = async (inputPath, quality=80) => {
  try {
    // Kiểm tra xem tệp có tồn tại không
    await fs.access(inputPath);
    // Tạo đường dẫn đầu ra cho tệp WEBP
    const outputPath = path.join(
      path.dirname(inputPath),
      `${path.basename(inputPath, path.extname(inputPath))}.webp`
    );
    // Chuyển đổi sang định dạng WEBP
    await sharp(inputPath)
      .webp({ quality }) // (0-100)
      .toFile(outputPath);
    // Xóa tệp ban đầu
    await fs.unlink(inputPath);
    return outputPath;
  } catch (error) {
  }
}

module.exports = { 
  delay, getMaxId, getRandomIdx, replaceWallpaperIdFromLink, getWallpaperIdFromLink, shuffleArray,
  readDirectory, readJSONFile, 
  ensureDirectoryExists, ensureJSONFileAndWrite,
  mergeJSONArrays,
  cropImage, cropImageLink, getHighImageUrl,
  convertToWebp
};