import { Material, Mesh, Vector3 } from 'three';
import { CSM } from 'three/examples/jsm/csm/CSM.js';
import { Viewer } from './Viewer';

const tempVec3 = new Vector3();
type Constructor = new (...args: any) => Viewer & { meshes: Mesh[] };
export function ShadowCSMViewerMixin<TBase extends Constructor>(base: TBase) {
    return class extends base {
        private csm: CSM;

        get lightDirection() {
            return this.csm.lightDirection;
        }

        constructor(...args: any) {
            super(...args);

            // TODO: the parent must be "world" or the light positions will be incorrect. The
            // csm plugin operates in scene frame, though.
            this.csm = new CSM({
                camera: this.getCamera(),
                maxFar: 20,
                cascades: 2,
                parent: this.scene,
            });
            this.csm.lights.forEach(l => {
                // TODO: maybe these biases should be tweaked per cascade light?
                l.shadow.bias = -1e-6;
                l.shadow.normalBias = 0.01;
            });
            this.csm.fade = true;

            this.addEventListener('before-render', () => {
                const camera = this.getCamera();
                const csm = this.csm;

                // TODO: this is a temporary hack to address the fact that the lights
                // are not in world frame but in scene frame
                tempVec3.copy(csm.lightDirection);
                csm.lightDirection.applyMatrix4(this.world.matrixWorld);

                // TODO: we should only update the frustums if the projection matrix has changed
                csm.camera = camera;
                csm.updateFrustums();
                // csm.update(csm.camera.matrixWorld);
                csm.update();

                csm.lightDirection.copy(tempVec3);
            });

        }

        beforeRender(delta: number) {
            super.beforeRender(delta);

            // apply global uniforms and csm
            // perform in `beforeRender` rather than the event callback to make sure
            // the rest of the system callbacks have run.
            const { meshes, csm } = this;
            meshes.forEach(m => {
                function updateMaterial(mat: Material) {
                    // initialize cascade shadow maps
                    if (mat && !(mat as any).__csm) {
                        (mat as any).__csm = true;
                        csm.setupMaterial(mat);
                        mat.needsUpdate = true;
                    }
                }

                const material = m.material;
                if (Array.isArray(material)) {
                    for (let i = 0, l = material.length; i < l; i++) {
                        updateMaterial(material[i]);
                    }
                } else {
                    updateMaterial(material);
                }
            });
        }

        setLightIntensity(intensity: number) {
            const { csm } = this;
            csm.lights.forEach(l => l.intensity = intensity);
            csm.lightIntensity = intensity;
        }
    };
}
