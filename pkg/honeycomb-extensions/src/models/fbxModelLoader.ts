import { LoadingManager } from '@gov.nasa.jpl.honeycomb/core';
import { Object3D } from 'three';

function loadFBX(path: string, options: any, manager: LoadingManager): Promise<Object3D> {
    return new Promise((resolve, reject) => {
        import('three/examples/jsm/loaders/FBXLoader.js').then( ({ FBXLoader }) => {
            const loader = new FBXLoader(manager);
            Object.assign(loader, options);
            loader.load(path, resolve, undefined, reject);
        });
    });
}

export { loadFBX };
