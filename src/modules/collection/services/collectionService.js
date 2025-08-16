
const { readJSONFile, ensureJSONFileAndWrite } = require('../../../utils/commonUtil');
const collectionQueue = require('../../../config/queue');
const { fetchDataFromProvider } = require('../providers/providerFactory');
const { updateTrack } = require('./googleSheetService');
const { updateTrackingCollections } = require('../../management/services/managementService');

// Queue processing...
collectionQueue.process(async (job) => {

  const collection = job.data;
  try {
    try {
      console.log(`\n[!] Tracking <${collection.collectionProvider}> collection (${collection.collectionId}) starting...`);
  
      const wallpapersCount = await fetchDataFromProvider(collection);
      if (wallpapersCount > 0) {
        collection.itemsTotal = wallpapersCount;
        collection.collectionStatus = 'tracked';
      } else {
        collection.collectionStatus = 'fail';
      }
    } catch (error) {
      collection.collectionStatus = 'error';
      console.log(`\n[x] Tracking <${collection.collectionProvider}> collection (${collection.collectionId}) failed: ${error.message}`);
    }
    // Update for sheet...
    await updateTrack(collection.collectionId, collection.collectionStatus);
  
    // Update this collection metadata
    const collections = await readJSONFile(process.env.FILE_PATH_LIST_TRACKING_COLL);
    const updatedCollections = collections.map(c =>
      (
        (c.collectionTargetId === collection.collectionTargetId) && (c.collectionId === collection.collectionId)
      ) ? collection : c
    );
    await ensureJSONFileAndWrite(process.env.FILE_PATH_LIST_TRACKING_COLL, updatedCollections);
    
    console.log(`\n[!] Tracking <${collection.collectionProvider}> collection (${collection.collectionId}) completed !!!`);
    
    // Get new track-collections...
    await updateTrackingCollections();
    
  } catch (error) {
    console.log(`\n[x] Tracking <${collection.collectionProvider}> collection (${collection.collectionId}) failed: ${error.message}`);
  }
});

const queueCollectionForProcessing = async (collection) => {
  await collectionQueue.add(collection);
};

module.exports = { queueCollectionForProcessing };