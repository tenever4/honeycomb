import ViewCubeHelper, { RollButtonType } from './ViewCubeHelper';
import { Camera, Vector3 } from 'three';

// TODO: Integrate these changes with the viewcubeHelper code
export class ViewCube extends ViewCubeHelper {
    private undoConstrainedHack: () => void;

    constructor(camera: Camera) {
        super(camera);

        this.resetCameraUpOnLerpFinished = true;
        this.alwaysLerpUp = false;
        this.setRollButtonType(RollButtonType.ALWAYS_OFF);

        this.undoConstrainedHack = () => {};

        this.onLerpInitialize = atTopOrBottomFace => {
            if (!atTopOrBottomFace) return;

            this.undoConstrainedHack();
            this.onChange();
        };

        this.onLerpStart = () => {
            this.onChange();
        };

        this.onLerping = () => {
            this.onChange();
        };

        this.onLerpFinished = () => {
            const camera = this.camera;

            camera.updateMatrixWorld(true);
            const currentCameraUp = new Vector3();
            currentCameraUp.setFromMatrixColumn(camera.matrixWorld, 1);
            const up = new Vector3(0, 1, 0);
            if (currentCameraUp.angleTo(up) > Math.PI / 2.0 - 0.00001) {
                // hack for OrbitControls: push camera backwards
                const cameraBackward = new Vector3();
                cameraBackward.setFromMatrixColumn(camera.matrixWorld, 2);

                if (cameraBackward.angleTo(up) > 0.00001) {
                    // bottom face: add
                    const offset = currentCameraUp.clone().multiplyScalar(0.000001);
                    camera.position.add(offset);

                    // save how to "undo" this hack
                    this.undoConstrainedHack = () => {
                        camera.position.sub(offset);
                    };
                } else {
                    // top face: subtract
                    const offset = currentCameraUp.clone().multiplyScalar(0.000001);
                    camera.position.sub(offset);

                    // save how to "undo" this hack
                    this.undoConstrainedHack = () => {
                        camera.position.add(offset);
                    };
                }
            }

            this.onChange();
        };
    }

    onChange() {}
}
