
const vision = require('@google-cloud/vision');

// Init client Google Vision
const client = new vision.ImageAnnotatorClient({
  keyFilename: 'google-vision-credentials.json'
});

const detectNSFW = async (imagePath) => {
  try {
    const [result] = await client.safeSearchDetection(imagePath);
    const detections = result.safeSearchAnnotation || {};

    // Các ngưỡng để xác định NSFW (UNKNOWN, VERY_UNLIKELY, UNLIKELY, POSSIBLE, LIKELY, VERY_LIKELY)
    return {
      adult: (detections.adult==='UNLIKELY' || detections.adult==='VERY_UNLIKELY') ? false : true,
      racy: (detections.racy==='UNLIKELY' || detections.racy==='VERY_UNLIKELY') ? false : true
    };
  } catch (error) {
    console.error(`Error processing ${imagePath}:`, error);
  }
};

module.exports = { detectNSFW };