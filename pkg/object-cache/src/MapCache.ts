export class MapCache<T> {
    private _map: Map<string, T>;

    constructor() {
        this._map = new Map();
    }

    has(key: string) {
        return this._map.has(key);
    }

    async set(key: string, v: T) {
        if (this._map.has(key)) throw new Error(`Cache already contains ${key}.`);
        return this._map.set(key, v);
    }

    async get(key: string) {
        if (!this._map.has(key)) return null;
        return this._map.get(key)!;
    }

    async delete(key: string) {
        return this._map.delete(key);
    }

    async clear() {
        return this._map.clear();
    }

    _keys() {
        return this._map.keys();
    }

    _values() {
        return this._map.values();
    }
}
