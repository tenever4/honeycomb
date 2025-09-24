import { LoadingManager } from '@gov.nasa.jpl.honeycomb/core';
import { DataTexture, TextureLoader } from 'three';

export function loadTextureFunction(path: string, options: any, manager: LoadingManager) {
    const resolvedPath = manager.resolveURL(path);
    const loader = new TextureLoader(manager);
    Object.assign(loader, options);
    return loader.load(resolvedPath);
}

export function loadPGMTextureFunction(path: string, options: any, manager: LoadingManager) {
    const resolvedPath = manager.resolveURL(path);
    manager.itemStart(resolvedPath);

    const tex = new DataTexture();
    import('@gov.nasa.jpl.honeycomb/pgm-loader')
        .then( ({ PGMLoader }) => {
            const loader = new PGMLoader();
            Object.assign(loader, options);

            return loader.load(resolvedPath, tex);
        })
        .finally(() => {
            manager.itemEnd(resolvedPath);
        });

    return tex;
}

export function loadVicarTextureFunction(path: string, options: any, manager: LoadingManager) {
    const resolvedPath = manager.resolveURL(path);
    manager.itemStart(resolvedPath);

    const tex = new DataTexture();
    import('@gov.nasa.jpl.honeycomb/vicar-loader')
        .then(({ VicarLoader }) => {
            const loader = new VicarLoader();
            Object.assign(loader, options);

            return loader.load(resolvedPath, tex);
        })
        .finally(() => {
            manager.itemEnd(resolvedPath);
        });

    return tex;
}

export function loadSGITextureFunction(path: string, options: any, manager: LoadingManager) {
    const resolvedPath = manager.resolveURL(path);
    manager.itemStart(resolvedPath);

    const tex = new DataTexture();
    import('@gov.nasa.jpl.honeycomb/sgi-loader')
        .then(({ SGILoader }) => {
            const loader = new SGILoader();
            Object.assign(loader, options);

            return loader.load(resolvedPath, tex);
        })
        .finally(() => {
            manager.itemEnd(resolvedPath);
        });

    return tex;
}
