import { LoadingManager } from '@gov.nasa.jpl.honeycomb/core';
import { Object3D } from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

interface ObjOptions {
    mtl: string;
}

function loadObj(path: string, options: Partial<ObjOptions>, manager: LoadingManager): Promise<Object3D> {
    return new Promise(async (resolve, reject) => {
        const [
            { MTLLoader },
            { OBJLoader },
            { SRGBColorSpace, DoubleSide },
        ] = await Promise.all([
            import('three/examples/jsm/loaders/MTLLoader.js'),
            import('three/examples/jsm/loaders/OBJLoader.js'),
            import('three'),
        ]);

        const mtlPath = options.mtl || path.replace(/obj$/, 'mtl');
        let materials: MTLLoader.MaterialCreator | undefined = undefined;
        const mtlLoader = new MTLLoader(manager);

        Object.assign(mtlLoader, options);

        mtlLoader.setMaterialOptions({ side: DoubleSide });
        mtlLoader.loadAsync(mtlPath)
            .then(mtlMaterials => {
                mtlMaterials.preload();
                materials = mtlMaterials;
            })
            .catch(() => { })
            .finally(() => {
                const loader = new OBJLoader(manager);
                Object.assign(loader, options);
                if (materials) {
                    loader.setMaterials(materials);
                }
                loader.load(path, mesh => {
                    mesh.traverse((c: any) => {
                        if (c.material?.map) {
                            c.material.map.colorSpace = SRGBColorSpace;
                        }
                    });
                    resolve(mesh);
                }, undefined, reject);
            });
    });
}

export { loadObj };
