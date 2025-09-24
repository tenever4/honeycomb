import { FrameTransformer } from '@gov.nasa.jpl.honeycomb/frame-transformer';
import {
    BufferGeometry,
    Camera,
    Group,
    Material,
    Mesh,
    Object3D,
    OrthographicCamera,
    PerspectiveCamera,
    Scene,
    Vector3,
    WebGLRenderer
} from 'three';

function isOrthographicCamera(v: Camera): v is OrthographicCamera {
    return (<any>v).isOrthographicCamera;
}

const tempVec = new Vector3();

type Constructor = new (...args: any) => Mesh;

/**
 * A mixin class for {@link Object3D} that will keep the rendering size of an
 * object constant no matter how far zoomed in or out the camera is.
 */
export function ScalingObjectMixin<TBase extends Constructor>(base: TBase) {
    return class extends base {
        private _onBeforeRender_old?: Object3D['onBeforeRender'];

        /**
         * Scaling factor of the object. This will stay constant to matter the camera zoom
         * @param scale Scaling factor of object
         */
        globalScale: number;

        constructor(...args: any) {
            super(...args);

            this.globalScale = 1;

            this._onBeforeRender_old = this.onBeforeRender;
            this.onBeforeRender = this._onBeforeRender.bind(this);
        }

        private _onBeforeRender(
            renderer: WebGLRenderer,
            scene: Scene,
            camera: Camera,
            geometry: BufferGeometry,
            material: Material,
            group: Group
        ) {
            this._onBeforeRender_old?.(
                renderer,
                scene,
                camera,
                geometry,
                material,
                group
            );

            const scale = this.scale;

            // FIXME(tumbar) Figure out how to make the globalScale mean something practically
            //               Convert it to screen coordinates scaling so that an object's size is scaled accordingly
            if (isOrthographicCamera(camera)) {
                scale.setScalar((this.globalScale * (camera.top - camera.bottom)) / 30);
            } else {
                const position = this.position;
                const parent = this.parent;
                FrameTransformer.transformPoint(
                    parent!.matrixWorld,
                    camera.matrixWorld,
                    position,
                    tempVec,
                );
                scale.setScalar((this.globalScale * 2 * tempVec.z) / (<PerspectiveCamera>camera).fov);
            }
            this.updateMatrixWorld();
        }
    };
}

