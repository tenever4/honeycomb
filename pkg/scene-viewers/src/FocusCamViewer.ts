import { Vector3, Quaternion, Object3D } from 'three';
import { Viewer } from './Viewer';

type Constructor = new (...args: any) => Viewer & { dirty: boolean };
export function FocusCamViewerMixin<TBase extends Constructor>(base: TBase) {
    return class extends base {
        fixedCamera: boolean;
        focusTarget?: Object3D;

        constructor(...args: any) {
            super(...args);

            // should camera move with focus target
            this.fixedCamera = true;

            let lastWorldInitialized = false;
            const tempSca = new Vector3();
            const tempQuat = new Quaternion();
            const lastWorldPos = new Vector3();
            const worldPos = new Vector3();

            // TODO: This should maybe be moved out of the viewers?
            this.addEventListener('before-render', () => {
                const target = this.focusTarget;

                // do nothing if we don't have a focus target
                if (target && this.fixedCamera) {
                    const controls = this.controls;
                    const camera = this.perspectiveCamera;

                    target.updateMatrixWorld();
                    target.matrixWorld.decompose(worldPos, tempQuat, tempSca);

                    // no need to update controls because we're shifting the camera along
                    // with the target.
                    controls.target.copy(worldPos);

                    // translate camera same amount as focus target moved
                    if (lastWorldInitialized) {
                        camera.position.sub(lastWorldPos).add(worldPos);
                        controls.update();
                        this.syncCameras();
                    }

                    lastWorldPos.copy(worldPos);
                    lastWorldInitialized = true;
                }
            });
        }
    };
}
