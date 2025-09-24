import { Vector2, Vector3, MathUtils, Camera, Scene, Mesh, WebGLRenderer } from 'three';

const tempScreenCoordinate = new Vector3();
const tempWorldPos = new Vector3();

type Constructor = new (...args: any) => Mesh;

export interface LabeledMesh extends Mesh {
    getScreenCoordinates: (worldPos: Vector3, renderer: WebGLRenderer, camera: Camera, target: Vector3) => void;
    updateLabelPosition: (renderer: WebGLRenderer, scene: Scene, camera: Camera) => void;
}

const tempSize = new Vector2();

export function LabeledMixin<TBase extends Constructor>(base: TBase) {
    return class extends base implements LabeledMesh {
        label: HTMLElement;
        readonly isLabel = true;

        labelVisible: boolean;
        labelOffset: Vector3;
        labelOpacity: number;
        startFade: number;
        endFade: number;

        constructor(...args: any) {
            super(...args);

            const label = document.createElement('div');
            label.style.position = 'absolute';
            label.style.display = 'inline-block';
            label.style.pointerEvents = 'none';

            this.label = label;

            this.labelVisible = true;
            this.labelOffset = new Vector3();
            this.labelOpacity = 1.0;
            this.startFade = 10;
            this.endFade = 12;
        }

        getScreenCoordinates(worldPos: Vector3, renderer: WebGLRenderer, camera: Camera, target: Vector3) {
            const size = renderer.getSize(tempSize);
            const widthHalf = 0.5 * size.width;
            const heightHalf = 0.5 * size.height;

            target.copy(worldPos);
            target.project(camera);

            target.x = (target.x + 1) * widthHalf;
            target.y = -(target.y - 1) * heightHalf;
        }

        updateLabelPosition(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
            const label = this.label;

            tempWorldPos.copy(this.labelOffset);
            tempWorldPos.applyMatrix4(this.matrixWorld);

            this.getScreenCoordinates(tempWorldPos, renderer, camera, tempScreenCoordinate);

            // walk up parent chain to see if we're visible or not
            let hierarchyVisibility = this.visible;
            let layerVisibility = (this.layers.mask & camera.layers.mask) !== 0;
            let parent = this.parent;
            while (parent !== null) {
                hierarchyVisibility = hierarchyVisibility && parent.visible;
                layerVisibility =
                    layerVisibility && (parent.layers.mask & camera.layers.mask) !== 0;
                parent = parent.parent;
            }

            // start fading out label starting at startFadeDist
            // label is completely invisible when cam > endFadeDist
            const startFadeDist = Math.pow(this.startFade, 2);
            const endFadeDist = Math.pow(this.endFade, 2);
            const distSq = tempWorldPos.distanceToSquared(camera.position);
            const labelOpacity = this.labelOpacity;
            let opacity = labelOpacity;
            if (startFadeDist < endFadeDist) {
                // map linear returns NaN if the values are Infinity
                const mappedDist = MathUtils.mapLinear(
                    MathUtils.clamp(distSq, startFadeDist, endFadeDist),
                    startFadeDist,
                    endFadeDist,
                    1,
                    0,
                );
                opacity = (isNaN(mappedDist) ? 1.0 : mappedDist) * labelOpacity;
            } else if (startFadeDist === endFadeDist) {
                if (distSq > endFadeDist) {
                    opacity = 0;
                } else {
                    opacity = labelOpacity;
                }
            }
            label.style.opacity = `${opacity}`;

            label.style.visibility =
                !this.labelVisible ||
                tempScreenCoordinate.z > 1 ||
                !hierarchyVisibility ||
                !layerVisibility
                    ? 'hidden'
                    : 'inherit';
            const zIndex = Math.floor((1 - tempScreenCoordinate.z) * 100000);
            label.style.transform = `translate3d(${tempScreenCoordinate.x}px, ${tempScreenCoordinate.y}px, ${zIndex}px)`;
        }

        copy(source: this) {
            super.copy(source);
            this.labelVisible = source.labelVisible;
            this.labelOffset.copy(source.labelOffset);
            this.labelOpacity = source.labelOpacity;

            this.startFade = source.startFade;
            this.endFade = source.endFade;
            return this;
        }
    };
}
