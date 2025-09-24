// eslint-disable-next-line no-var
var globalFetchOptions: Partial<RequestInit> = {};

export function updateGlobalFetchOptions(options: Partial<RequestInit>) {
    globalFetchOptions = {
        ...globalFetchOptions,
        ...options
    };
}

abstract class FetchLoaderBase<T, V, S = any> {
    /**
     * Fetch options for loading the file/resource.
     */
    protected fetchOptions: RequestInit = {
        credentials: 'same-origin'
    };

    /**
     * Loads and parses a file/resource. Promise
     * resolves with the returned data from {@link FetchLoaderBase.parse parse} function
     * @param url URL of file/resource to load
     */
    abstract load(url: string, ...args: S[]): Promise<T>;

    /**
     * Parse the contents of a file/resource and return an object
     * describing the contents
     * @param value Value fetched from a file
     */
    abstract parse(value: V, ...args: S[]): T | Promise<T>;
}

export abstract class FetchTextLoader<T, S = any> extends FetchLoaderBase<T, string, S> {
    async load(url: string, ...args: S[]): Promise<T> {
        const res = await fetch(url, {
            ...this.fetchOptions,
            ...globalFetchOptions
        });
        if (!res.ok) {
            throw new Error(`Failed to load file "${url}" with status ${res.status} : ${res.statusText}`);
        }
        const txt = await res.text();
        return this.parse(txt, ...args);
    }
}

export abstract class FetchBlobLoader<T, S = any> extends FetchLoaderBase<T, Blob, S> {
    async load(url: string, ...args: S[]): Promise<T> {
        const res = await fetch(url, {
            ...this.fetchOptions,
            ...globalFetchOptions
        });
        if (!res.ok) {
            throw new Error(`Failed to load file "${url}" with status ${res.status} : ${res.statusText}`);
        }
        const txt = await res.blob();
        return await this.parse(txt, ...args);
    }
}

export abstract class FetchArrayBufferLoader<T, S = any> extends FetchLoaderBase<T, ArrayBuffer, S> {
    async load(url: string, ...args: S[]): Promise<T> {
        const res = await fetch(url, {
            ...this.fetchOptions,
            ...globalFetchOptions
        });
        if (!res.ok) {
            throw new Error(`Failed to load file "${url}" with status ${res.status} : ${res.statusText}`);
        }
        const txt = await res.arrayBuffer();
        return await this.parse(txt, ...args);
    }
}
