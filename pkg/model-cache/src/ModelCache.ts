import { Object3D, Texture } from "three";

function clone<T = null | undefined | Object3D | Promise<Object3D> | Object3D[] | Texture>(obj: T): T {
    let target: any;
    if (obj === null || obj === undefined) {
        return obj;
    } else if (obj instanceof Promise) {
        return obj;
    } else if (Array.isArray(obj)) {
        target = [];
    } else if (obj instanceof Object3D) {
        return obj.clone(true);
    } else if (obj instanceof Texture) {
        return obj.clone();
    } else if (typeof obj === "object") {
        target = {};
    } else {
        return obj;
    }

    for (const key in obj) {
        target[key] = clone(obj[key]);
    }

    return target;
}

/**
 * Converts the given objects into a hash.
 */
export function hash(...args: any[]): string {
    return args
        .map(item => {
            if (typeof item === 'object') {
                return JSON.stringify(item);
            } else {
                return item;
            }
        })
        .join('|');
}

/** Cache for three.js models and objects */
export class ModelCache<T> {
    cache: { [hash: string]: T | Promise<T> };
    unusedMap: { [hash: string]: number };

    constructor() {
        this.cache = {};
        this.unusedMap = {};
    }

    /**
     * Adds the given object to the cache indexed by `hash`.
     */
    add(hash: string, model: T | Promise<T>) {
        if (hash in this.cache) {
            throw new Error(`ModelCache: '${hash}' is already cached.`);
        }

        if (model instanceof Promise) {
            const pr = model.then(res => {
                if (this.cache[hash] === pr) {
                    this.cache[hash] = res;
                }
                return res;
            });
            pr.catch(() => {
                this.delete(hash);
            });

            this.cache[hash] = pr;
        } else {
            this.cache[hash] = model;
        }
    }

    /**
     * Returns whether or not the given hash exists in the cache.
     */
    has(hash: string): boolean {
        return hash in this.cache;
    }

    /**
     * Returns whether the object indexed by the given hash is pending
     * a promise that hasn't resolved yet.
     */
    isPending(hash: string): boolean {
        return this.cache[hash] instanceof Promise;
    }

    /**
     * Removes the object at the given hash and returns the deleted object.
     */
    delete(hash: string): T | Promise<T> {
        const res = this.cache[hash];
        delete this.cache[hash];
        delete this.unusedMap[hash];
        return res;
    }

    /**
     * Returns the original object added into the cache.
     */
    get(hash: string): T | Promise<T> {
        if (this.has(hash)) {
            delete this.unusedMap[hash];
            return this.cache[hash];
        } else {
            throw new Error(`Object with hash ${hash} not in ModelCache`);
        }
    }

    /**
     * Returns a clone of the object indexed by the given hash or a promise
     * that will resolve with a copy.
     */
    getClone(hash: string): T | Promise<T> {
        if (this.has(hash)) {
            delete this.unusedMap[hash];
            if (this.isPending(hash)) {
                // Throw if the dependent promise throws
                return new Promise((resolve, reject) => {
                    (this.cache[hash] as Promise<T>)
                        .then(res => resolve(clone(res)))
                        .catch(err => reject(err));
                });
            } else {
                return clone(this.cache[hash]);
            }
        } else {
            throw new Error(`Object with hash ${hash} not in ModelCache`);
        }
    }

    /**
     * Increments the amount of times a model has been left unused by one.
     * If a model has never been marked unused then it is set to 1. Every
     * time a model is retrieved using {@link #ModelCache#getClone getClone}
     * the unused counter is reset.
     * @returns {void}
     */
    markUnused() {
        const cache = this.cache;
        const unusedMap = this.unusedMap;
        for (const key in cache) {
            if (key in unusedMap) {
                unusedMap[key]++;
            } else {
                unusedMap[key] = 1;
            }
        }
    }

    /**
     * Removes any cached item that has been marked as unused >= `count`
     * number of times. The number of models removed is returned.
     */
    cullUnused(unusedCount: number = 1) {
        const unusedMap = this.unusedMap;
        let removed = 0;
        for (const key in unusedMap) {
            const count = unusedMap[key];
            if (count >= unusedCount) {
                this.delete(key);
                removed++;
            }
        }
        return removed;
    }

    /**
     * Clears the cache entirely. The number of models removed is returned.
     */
    clear(): void {
        this.markUnused();
        this.cullUnused();
    }
}
