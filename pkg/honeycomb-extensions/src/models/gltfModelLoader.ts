import { LoadingManager } from '@gov.nasa.jpl.honeycomb/core';
import { Object3D } from 'three';

function loadGLTF(path: string, options: any, manager: LoadingManager): Promise<Object3D> {
    return new Promise((resolve, reject) => {
        import('three/examples/jsm/loaders/GLTFLoader.js').then( ({ GLTFLoader }) => {
            const loader = new GLTFLoader(manager);
            Object.assign(loader, options);
            loader.load(path, res => resolve(res.scene), undefined, reject);
        });
    });
}

export { loadGLTF };
