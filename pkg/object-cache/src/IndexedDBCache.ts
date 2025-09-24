// TODO: we may want to retain the contents of the indexeddb across reloads for cases
// like where a live sim is playing and the previous data is relevant even after reload.
// But that might require some other changes to animators to support. It might be easier
// to just create a service to live-write all contents of a sim to an HC file format.
const DURABILITY_OPTIONS: IDBTransactionOptions = { durability: 'relaxed' };
const STORE_NAME = 'honeycomb-files';
const DATABASE_PREFIX = 'HONEYCOMB_CACHE_DATABASE';

let dbIndex = 0;
export class IndexedDBCache {
    activePromises: { [name: string]: Promise<void> };
    activeTransactions: { [name: string]: IDBTransaction };
    dbPromise?: Promise<IDBDatabase>;
    dbName: string;

    constructor() {
        this.activePromises = {};
        this.activeTransactions = {};
        this.dbName = `${DATABASE_PREFIX}-${dbIndex}`;
        dbIndex++;

        // clear out the cache on unload
        window.addEventListener('beforeunload', () => {
            this.clear();
            window.indexedDB.deleteDatabase(this.dbName);
        });
    }

    _getDatabase() {
        return this.dbPromise = this.dbPromise || new Promise((resolve, reject) => {
            // delete the contents of the database in case it didn't get cleared
            // out for some reason.
            const databaseName = this.dbName;
            window.indexedDB.deleteDatabase(databaseName);

            const request = window.indexedDB.open(databaseName);
            request.onupgradeneeded = () => {
                const db = request.result;
                db.createObjectStore(STORE_NAME);
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("Failed to create object store");
        });
    }

    async has() {
        const db = await this._getDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const request = transaction.objectStore(STORE_NAME).count();
            request.onsuccess = () => resolve(request.result !== 0);
            request.onerror = () => reject(request.error);
            transaction.commit();
        });
    }

    async set(key: string, value: any) {
        const db = await this._getDatabase();
        const { activeTransactions, activePromises } = this;

        // TODO: is it faster to serialize / deserialize this data so arrays are stored as array buffers
        // rather than raw arrays?
        let transaction: IDBTransaction;
        const promise = new Promise<void>((resolve, reject) => {
            transaction = db.transaction(STORE_NAME, 'readwrite', DURABILITY_OPTIONS);
            activeTransactions[key] = transaction;

            const request = transaction.objectStore(STORE_NAME).add(value, key);
            request.onsuccess = () => {
                delete activePromises[key];
                delete activeTransactions[key];
                resolve();
            };
            request.onerror = () => {
                delete activePromises[key];
                delete activeTransactions[key];
                reject(request.error);
            };
            transaction.commit();
        });

        activePromises[key] = promise;
        return promise;
    }

    async get(key: string) {
        const db = await this._getDatabase();
        const { activePromises } = this;
        if (key in activePromises) {
            await activePromises[key];
        }

        return new Promise(resolve => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const request = transaction.objectStore(STORE_NAME).get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
            transaction.commit();
        });
    }

    async delete(key: string) {
        const { activeTransactions } = this;
        if (key in activeTransactions) {
            activeTransactions[key].abort();
        } else {
            const db = await this._getDatabase();
            return new Promise<void>(resolve => {
                const transaction = db.transaction(STORE_NAME, 'readwrite', DURABILITY_OPTIONS);
                const request = transaction.objectStore(STORE_NAME).delete(key);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
                transaction.commit();
            });
        }
    }

    async clear() {
        const { activeTransactions } = this;
        for (const key in activeTransactions) {
            activeTransactions[key].abort();
        }

        const db = await this._getDatabase();
        return new Promise<void>(resolve => {
            const transaction = db.transaction(STORE_NAME, 'readwrite', DURABILITY_OPTIONS);
            const request = transaction.objectStore(STORE_NAME).clear();
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            transaction.commit();
        });
    }
}
