import { LoadingManager } from '@gov.nasa.jpl.honeycomb/core';
import { MeshPhongMaterial, Mesh, Object3D } from 'three';

function loadSTL(path: string, options: any, manager: LoadingManager): Promise<Object3D> {
    return new Promise((resolve, reject) => {
        import('three/examples/jsm/loaders/STLLoader.js').then( ({ STLLoader }) => {
            const loader = new STLLoader(manager);
            Object.assign(loader, options);
            loader.load(
                path,
                geometry => {
                    const material = new MeshPhongMaterial();
                    const mesh = new Mesh(geometry, material);
                    resolve(mesh);
                },
                undefined,
                err => {
                    reject(err);
                }
            );
        });
    });
}

export { loadSTL };
