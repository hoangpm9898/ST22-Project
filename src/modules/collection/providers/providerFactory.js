
const { 
  fetchItemsByTag, 
  fetchItemsByModel, 
  fetchItemsByAccount,
  fetchCollectionsByAccount
} = require('./seaart.ai');

// const providerEndpoints = {
//   'seaart.ai': {
//     list_items_by_account_id: 'https://api.seaart.ai/list_by_account',
//     list_items_by_model_id: 'https://api.seaart.ai/list_by_model',
//     list_related_items_by_account_id: 'https://api.seaart.ai/related_by_account',
//   }
// };

const fetchDataFromProvider = async (collection) => {

  let itemsCount = 0;

  // const endpoint = providerEndpoints[collection.collectionProvider][collection.collectionType];
  // if (!endpoint) throw new Error(`Unsupported endpoint for ${collection.collectionProvider}`);

  if (collection && collection.collectionProvider === 'seaart.ai') {
    switch (collection.collectionType) {
      case 'Tag':
        itemsCount = await fetchItemsByTag(collection);
        break;
      case 'Model':
        itemsCount = await fetchItemsByModel(collection);
        break;
      case 'User_Work':
        itemsCount = await fetchItemsByAccount(collection);
        break;
      case 'User_Collection':
        itemsCount = await fetchCollectionsByAccount(collection);
        break;
      default:
        break;
    };
  }
  return itemsCount;
};

module.exports = { fetchDataFromProvider };