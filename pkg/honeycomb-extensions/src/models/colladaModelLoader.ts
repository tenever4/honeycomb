import { LoadingManager } from '@gov.nasa.jpl.honeycomb/core';
import { Object3D } from 'three';
import { CustomColladaLoader } from './CustomColladaLoader';

function loadCollada(path: string, options: any, manager: LoadingManager): Promise<Object3D> {
    return new Promise((resolve, reject) => {
        const loader = new CustomColladaLoader(manager);
        Object.assign(loader, options);
        loader.load(path, res => resolve(res.scene), undefined, reject);
    });
}

export { loadCollada };
