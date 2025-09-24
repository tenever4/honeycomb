import { CameraHelper, DirectionalLight, Group, Vector3 } from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

import { Viewer } from '@gov.nasa.jpl.honeycomb/core';
import {
    DirtyViewerMixin,
    FocusCamViewerMixin,
    ViewCubeViewerMixin
} from '@gov.nasa.jpl.honeycomb/scene-viewers';


const unitX = new Vector3(1, 0, 0);
const tempVec3a = new Vector3();

type Constructor = new (...args: any) => Viewer;
export function LightingViewerMixin<TBase extends Constructor>(base: TBase) {
    return class extends base {

        directionalLightParent: Group;
        directionalLight: DirectionalLight;
        directionalLightHelper: CameraHelper;

        constructor(...args: any) {
            super(...args);

            const light = new DirectionalLight(0xffffff, 1);

            light.target.visible = false;
            // Orientation of light will point to the target
            light.target.position.set(0, 0, 0);

            light.position.set(100, 0, 0);

            light.castShadow = true;
            light.shadow.mapSize.setScalar(2048 * 4);
            light.shadow.bias = -1e-6;
            light.shadow.normalBias = 1e-4;
            light.shadow.camera.near = 0;
            // light.shadow.camera.far = 3500;
            light.shadow.intensity = 1;

            const frustumSize = 300;
            light.shadow.camera.top = frustumSize;
            light.shadow.camera.bottom = -frustumSize;
            light.shadow.camera.left = -frustumSize;
            light.shadow.camera.right = frustumSize;

            this.directionalLight = light;
            this.directionalLightParent = new Group();
            this.directionalLightParent.position.set(0, 0, 0);

            this.directionalLightHelper = new CameraHelper(this.directionalLight.shadow.camera);
            this.directionalLightHelper.visible = false;

            this.directionalLightParent.add(this.directionalLight);
            this.directionalLightParent.add(light.target);

            this.world.add(this.directionalLightParent);
            this.scene.add(this.directionalLightHelper);
        }

        setSunDirection(direction: Vector3) {
            tempVec3a.copy(direction);
            tempVec3a.normalize();

            // Point the directional light torward the sun direction vector
            this.directionalLightParent.quaternion.setFromUnitVectors(
                unitX,
                tempVec3a
            );
        }

        getSunDirection(): Vector3 {
            tempVec3a.copy(unitX);
            tempVec3a.applyQuaternion(this.directionalLightParent.quaternion);
            return tempVec3a.clone();
        }
    };
}

export function TransformControlsViewerMixin<TBase extends Constructor>(base: TBase) {
    return class extends base {
        transformControls: TransformControls;
        private _lastFixedCamera: boolean;

        constructor(...args: any) {
            super(...args);
            this.transformControls = new TransformControls(
                this.perspectiveCamera,
                this.renderer.domElement
            );

            // Re-attach the orbit control DOM listeners
            // A little hack needed to make sure the transform control DOM listeners
            // run before the orbit control listeners
            // This is needed because when the transformControls activate we need to
            // disable the orbit controls so that we don't rotate the camera while we are moving an object
            this.controls.disconnect();
            this.controls.connect();

            const gizmo = this.transformControls.getHelper();
            this.scene.add(gizmo);

            // Don't show the transform controls unless enabled externally
            this.transformControls.enabled = false;

            this.transformControls.addEventListener(
                'dragging-changed',
                this._onTransformDraggingChanged.bind(this)
            );

            this._lastFixedCamera = this.fixedCamera;
        }

        private _onTransformDraggingChanged = (ev: any) => {
            if (ev.value) {
                // Started moving transform controls
                // Temporarily disable the orbit controls and the focus target
                this.controls.enabled = false;
                this._lastFixedCamera = this.fixedCamera;
                this.fixedCamera = false;
            } else {
                // Transform dragging finished
                // Re-able the orbit controls
                this.controls.enabled = true;
                this.fixedCamera = this._lastFixedCamera;
            }

            this.dirty = true;
        }
    };
}

export class RsvpViewer extends DirtyViewerMixin(
    ViewCubeViewerMixin(
        FocusCamViewerMixin(
            TransformControlsViewerMixin(
                LightingViewerMixin((Viewer)))))
) {
}
