const axios = require('axios');
const { readJSONFile } = require('../../../utils/commonUtil');

async function verifyUrl(url) {
  console.debug(`Checking URL: ${url}`);
  try {
    await axios.head(url, { timeout: 10000 });
    return true;
  } catch (error) {
    return false;
  }
}

async function checkAlbumUrls(albums) {

  const invalidAlbums = [];

  for (const album of albums) {

    console.debug(`\n[!] - Checking album ID: ${album.id} (${album.name})`);

    let hasError = false;
    const invalidAlbum = {
      id: album.id,
      name: album.name,
      thumb_error_link: null,
      photo_error_links: []
    };

    if (album.thumb_url) {
      if (!(await verifyUrl(album.thumb_url))) {
        invalidAlbum.thumb_error_link = album.thumb_url;
        hasError = true;
        console.debug(`[!] - Invalid thumb URL: ${album.thumb_url}`);
      }
    }
    if (album.photos_url) {
      for (const url of album.photos_url) {
        if (!(await verifyUrl(url))) {
          invalidAlbum.photo_error_links.push(url);
          hasError = true;
          console.debug(`[!] - Invalid photo URL: ${url}`);
        }
      }
    }
    if (hasError) {
      invalidAlbums.push(invalidAlbum);
    }
  }
  console.debug(`\n[!] Finished URL checks: ${invalidAlbums.length} invalid albums`);
  return invalidAlbums;
}

async function checkTagUrls(tags) {

  const invalidTags = [];

  for (const tag of tags) {

    console.debug(`\n[!] Checking tag ID: ${tag.id} (${tag.name})`);

    let hasError = false;
    const invalidTag = {
      id: tag.id,
      name: tag.name,
      thumb_error_link: null
    };

    if (tag.thumb) {
      if (!(await verifyUrl(tag.thumb))) {
        invalidTag.thumb_error_link = tag.thumb;
        hasError = true;
        console.debug(`[!] - Invalid URL: ${tag.thumb}`);
      }
    }
    if (hasError) {
      invalidTags.push(invalidTag);
    }
  }
  console.debug(`\n[!] Finished URL checks: ${invalidTags.length} invalid tags`);
  return invalidTags;
}

async function verifyAllUrls(typeVerify) {

  console.debug('\n[!] Starting verification for all items...');

  let jsonData;
  let invalidLinks;
  try {
    if (typeVerify==='albums') {
      jsonData = await readJSONFile(`${process.env.APP_RESULTS_PATH}/albums.json`);
      invalidLinks = await checkAlbumUrls(jsonData);
    }
    else if (typeVerify==='tags') {
      jsonData = await readJSONFile(`${process.env.APP_RESULTS_PATH}/tags.json`);
      invalidLinks = await checkTagUrls(jsonData);
    }
    // console.log(JSON.stringify(invalidLinks, null, 2));
    return invalidLinks;

  } catch (error) {
    console.error('\n[x] Error:', error.message);
  }
}

module.exports = { 
  verifyAllUrls
};