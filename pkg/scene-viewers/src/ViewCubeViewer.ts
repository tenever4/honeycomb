import { Euler } from 'three';
import { ViewCube } from '@gov.nasa.jpl.honeycomb/view-cube';
import { Viewer } from './Viewer';

type Constructor = new (...args: any) => Viewer;
export function ViewCubeViewerMixin<TBase extends Constructor>(base: TBase) {
    return class extends base {
        viewCube: ViewCube;
        _viewCubeContainer: HTMLDivElement;
        isDirtyViewer?: boolean;
        dirty?: boolean;

        _updateViewCubeCenterCallback: () => void;
        _updateViewCubeCameraCallback: () => void;
        _propagateViewCubeMouseEventsCallback: (e: MouseEvent) => void;
        _propagateViewCubeContextMenuEventCallback: (e: MouseEvent) => void;

        get domElement(): HTMLElement {
            return this._viewCubeContainer;
        }

        get viewCubeEnabled() {
            return this.viewCube.domElement.style.visibility !== 'hidden';
        }

        set viewCubeEnabled(v) {
            if (this.viewCubeEnabled !== v) {
                this.viewCube.domElement.style.visibility = v ? 'visible' : 'hidden';
                if (v) {
                    this.initViewCubeEvents();
                } else {
                    this.removeViewCubeEvents();
                }
            }
        }

        constructor(...args: any) {
            super(...args);

            const world = this.world;
            world.addEventListener('orientation-changed', () => {
                this.viewCube.setAxesOrientation(this.world.quaternion);
            });

            const renderer = this.renderer;
            const viewCube = new ViewCube(this.getCamera());
            const viewCubeContainer = document.createElement('div');

            // TODO: this is making an assumption that the cube orientation should align to mars rover
            // axes (X is forward, Y is left)
            viewCube.setFaceOrientation(new Euler(0, Math.PI / 2, 0));

            viewCubeContainer.style.position = 'relative';

            const canvas = super.domElement;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            viewCubeContainer.appendChild(canvas);
            viewCubeContainer.appendChild(viewCube.domElement);

            viewCube.domElement.style.position = 'absolute';
            viewCube.domElement.style.right = '0';
            viewCube.domElement.style.top = '0';

            viewCube.xDomElement.style.visibility = 'hidden';
            viewCube.yDomElement.style.visibility = 'hidden';
            viewCube.zDomElement.style.visibility = 'hidden';

            viewCube.onChange = () => {
                if (this.isDirtyViewer) {
                    this.dirty = true;
                }
            };

            const cameraToggle = document.createElement('div');
            cameraToggle.style.borderRadius = '10px';
            cameraToggle.style.width = '20px';
            cameraToggle.style.height = '20px';
            cameraToggle.style.background = 'rgba(0, 0, 0, 0.25)';
            cameraToggle.style.right = '10px';
            cameraToggle.style.bottom = '0';
            cameraToggle.style.position = 'absolute';

            const lineStyles = 'stroke: white; stroke-width: 1.5; vector-effect: non-scaling-stroke; stroke-linecap: round;';
            const orthoSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            orthoSvg.setAttribute('width', '20');
            orthoSvg.setAttribute('height', '20');
            orthoSvg.setAttribute('preserveAspectRatio', 'none');
            orthoSvg.setAttribute('viewBox', '-0.3 -1 1.6 3');
            orthoSvg.setAttributeNS(
                'http://www.w3.org/2000/xmlns/',
                'xmlns:xlink',
                'http://www.w3.org/1999/xlink',
            );
            orthoSvg.style.display = 'block';
            orthoSvg.innerHTML = `
                <line
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                    style="${lineStyles}"
                >
                </line>
                <line
                    x1="0"
                    y1="0.5"
                    x2="1"
                    y2="0.5"
                    style="${lineStyles}"
                >
                </line>
                <line
                    x1="0"
                    y1="1"
                    x2="1"
                    y2="1"
                    style="${lineStyles}"
                >
                </line>
            `;

            const perspSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            perspSvg.setAttribute('width', '20');
            perspSvg.setAttribute('height', '20');
            perspSvg.setAttribute('preserveAspectRatio', 'none');
            perspSvg.setAttribute('viewBox', '-0.3 -1 1.6 3');
            perspSvg.setAttributeNS(
                'http://www.w3.org/2000/xmlns/',
                'xmlns:xlink',
                'http://www.w3.org/1999/xlink',
            );
            perspSvg.style.display = 'block';
            perspSvg.innerHTML = `
                <line
                    x1="0"
                    y1="0.5"
                    x2="0.85"
                    y2="-0.3"
                    style="${lineStyles}"
                >
                </line>
                <line
                    x1="0"
                    y1="0.5"
                    x2="1"
                    y2="0.5"
                    style="${lineStyles}"
                >
                </line>
                <line
                    x1="0"
                    y1="0.5"
                    x2="0.85"
                    y2="1.3"
                    style="${lineStyles}"
                >
                </line>
            `;
            cameraToggle.appendChild(orthoSvg);
            cameraToggle.appendChild(perspSvg);
            cameraToggle.addEventListener('click', () => {
                this.orthographic = !this.orthographic;
                if (this.isDirtyViewer) {
                    this.dirty = true;
                }
            });

            viewCube.domElement.appendChild(cameraToggle);

            const cameraIcon = document.createElement('div');
            cameraIcon.style.display = 'inline-block';

            this._updateViewCubeCenterCallback = () => {
                viewCube.lerpCenter.copy(this.controls.target);
                viewCube.orbitCenter.copy(this.controls.target);
            };

            this._updateViewCubeCameraCallback = () => {
                viewCube.camera = this.getCamera();
                orthoSvg.style.display = this.orthographic ? 'block' : 'none';
                perspSvg.style.display = this.orthographic ? 'none' : 'block';
            };

            // https://stackoverflow.com/questions/11974262/how-to-clone-or-re-dispatch-dom-events
            this._propagateViewCubeMouseEventsCallback = (e) => {
                if (!viewCube.hitFace) {
                    renderer.domElement.dispatchEvent(new MouseEvent(e.type, e));
                }
            };

            this._propagateViewCubeContextMenuEventCallback = (e) => {
                renderer.domElement.dispatchEvent(new MouseEvent(e.type, e));
                e.preventDefault();
            };

            this.viewCube = viewCube;
            this._viewCubeContainer = viewCubeContainer;

            this.initViewCubeEvents();
            this.viewCubeEnabled = args[0]?.viewCubeVisible ?? true;
        }

        initViewCubeEvents() {
            const { viewCube, controls } = this;

            controls.addEventListener('change', this._updateViewCubeCenterCallback);

            this.addEventListener('before-render', this._updateViewCubeCameraCallback);

            viewCube.domElement.addEventListener(
                'contextmenu',
                this._propagateViewCubeContextMenuEventCallback,
            );

            viewCube.domElement.addEventListener(
                'mousedown',
                this._propagateViewCubeMouseEventsCallback,
            );

            viewCube.domElement.addEventListener(
                'mousemove',
                this._propagateViewCubeMouseEventsCallback,
            );

            viewCube.domElement.addEventListener(
                'mouseup',
                this._propagateViewCubeMouseEventsCallback,
            );
        }

        removeViewCubeEvents() {
            const { viewCube, controls } = this;

            controls.removeEventListener('change', this._updateViewCubeCenterCallback);
            this.removeEventListener('before-render', this._updateViewCubeCameraCallback);

            viewCube.domElement.removeEventListener(
                'contextmenu',
                this._propagateViewCubeContextMenuEventCallback,
            );

            viewCube.domElement.removeEventListener(
                'mousedown',
                this._propagateViewCubeMouseEventsCallback,
            );

            viewCube.domElement.removeEventListener(
                'mousemove',
                this._propagateViewCubeMouseEventsCallback,
            );

            viewCube.domElement.removeEventListener(
                'mouseup',
                this._propagateViewCubeMouseEventsCallback,
            );
        }

        dispose() {
            super.dispose();

            this.removeViewCubeEvents();
            this.viewCube.dispose();
        }
    };
}
