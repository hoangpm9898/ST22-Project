const { fetchTracks } = require('../services/googleSheetService');
const { queueCollectionForProcessing } = require('../services/collectionService');

const syncCollections = async (req, res) => {
  try {
    // Fetch track-collections...
    const collections = await fetchTracks();

    if (!collections || collections.length === 0) {
      return res.status(404).json({ error: 'No collections found' });
    }
    console.log(`\n[!] We has ${collections.length} collections!!!`);
    
    let readyCount = 0;
    for (const collection of collections) {
      // Load ready track collections
      if (['ready','fail','error'].includes(collection.collectionStatus)) {
        // Push to Queue...
        await queueCollectionForProcessing(collection);
        readyCount+=1;
      }
    }
    res.json({ message: `Has ${readyCount} ready collections synced and queued for processing` });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { syncCollections };