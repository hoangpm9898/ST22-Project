const { google } = require('googleapis');

const { ensureJSONFileAndWrite } = require('../../../utils/commonUtil');
const { TrackCollection } = require('../models/trackCollection');

const auth = new google.auth.GoogleAuth({
  keyFile: 'api-projects-461703-ecb31530fbc7.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({
  version: 'v4',
  auth
});

const fetchTracks = async () => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${process.env.GOOGLE_SHEET_NAME}!A1:J`,
    });
  
    const rows = response.data.values;
    const collections = rows.slice(1).map(row => new TrackCollection({
      // ID 
      collectionId: parseInt(row[0]),
      // Status 
      collectionStatus: row[1],
      // Provider
      collectionProvider: row[2],
      // Collection Topic
      collectionTopic: row[3],
      // Collection Style
      collectionStyle: row[4],
      // Collection Type
      collectionType: row[5],
      // Collection ID
      collectionTargetId: row[6],
    }));
    
    const trackCollections = collections.map(c => new TrackCollection({
      collectionId: c.collectionId,
      collectionStatus: c.collectionStatus,
      collectionProvider: c.collectionProvider,
      collectionTopic: c.collectionTopic,
      collectionStyle: c.collectionStyle,
      collectionType: c.collectionType,
      collectionTargetId: c.collectionTargetId,
    }));
    await ensureJSONFileAndWrite(process.env.FILE_PATH_LIST_TRACKING_COLL, trackCollections);

    return trackCollections;
    
  } catch (error) {
    console.error('\n[x] Error fetch list track collections:', error);
  }
};

const updateTrack = async (collectionId, status) => {
  try {
    // Tính index của hàng trong sheet (collection.id + 1 vì index bắt đầu từ A2)
    const sheetRowIndex = parseInt(collectionId) + 1;

    // Cập nhật giá trị tại cột B của hàng tương ứng
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${process.env.GOOGLE_SHEET_NAME}!B${sheetRowIndex}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[status]],
      },
    });
    console.log(`[!] Updating track collection [${collectionId}] success: ${status}`);

  } catch (error) {
    console.error('[x] Error updating track collection:', error);
  }
};

module.exports = { fetchTracks, updateTrack };
