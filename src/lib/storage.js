const DB_NAME = 'echoes-lantern-db';
const STORE_NAME = 'memories';
const DB_VERSION = 1;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('This browser does not support local memory storage.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local storage.'));
  });
}

async function runTransaction(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let request;
    try {
      request = action(store);
    } catch (error) {
      database.close();
      reject(error);
      return;
    }
    transaction.oncomplete = () => {
      resolve(request?.result);
      database.close();
    };
    transaction.onerror = () => {
      reject(transaction.error || new Error('Local storage operation failed.'));
      database.close();
    };
    transaction.onabort = () => {
      reject(transaction.error || new Error('Local storage operation was cancelled.'));
      database.close();
    };
  });
}

export function getAllMemories() {
  return runTransaction('readonly', (store) => store.getAll());
}

export function saveMemory(memory) {
  return runTransaction('readwrite', (store) => store.put(memory));
}

export function deleteMemory(id) {
  return runTransaction('readwrite', (store) => store.delete(id));
}

export function clearMemories() {
  return runTransaction('readwrite', (store) => store.clear());
}
