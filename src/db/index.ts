import {
  isGoDaddyDbConfigured,
  GODADDY_COLLECTIONS,
  fetchAllDocuments,
  getDocument,
  upsertDocument,
  updateDocumentFields,
  deleteDocument,
  subscribeCollectionDocs,
  clearCollection,
  godaddyDbConfig,
} from './godaddyDb.ts';

export {
  isGoDaddyDbConfigured,
  isGoDaddyDbConfigured as isFirebaseConfigured, // Backward compatibility alias if needed
  GODADDY_COLLECTIONS,
  GODADDY_COLLECTIONS as FIREBASE_COLLECTIONS,
  GODADDY_COLLECTIONS as ADMIN_COLLECTIONS,
  fetchAllDocuments,
  fetchAllDocuments as adminFetchAllDocuments,
  getDocument,
  getDocument as adminGetDocument,
  upsertDocument,
  upsertDocument as adminUpsertDocument,
  updateDocumentFields,
  updateDocumentFields as adminUpdateDocumentFields,
  deleteDocument,
  deleteDocument as adminDeleteDocument,
  clearCollection as adminClearCollection,
  subscribeCollectionDocs,
  godaddyDbConfig,
  godaddyDbConfig as firebaseConfig,
};
