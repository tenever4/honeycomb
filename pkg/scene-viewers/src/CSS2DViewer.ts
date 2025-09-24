import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { Viewer } from "./Viewer";

type Constructor = new (...args: any) => Viewer & { dirty: boolean };
export function CSS2DViewerMixin<TBase extends Constructor>(base: TBase) {
    return class extends base {
        private _wrapperContainer: HTMLDivElement;
        private _cssRenderer: CSS2DRenderer;

        readonly isCSS2DViewer = true;

        get domElement() {
            return this._wrapperContainer;
        }

        constructor(...args: any) {
            super(...args);

            const canvas = super.domElement;
            this._wrapperContainer = document.createElement('div');
            this._wrapperContainer.style.position = 'relative';

            this._cssRenderer = new CSS2DRenderer();
            this._cssRenderer.domElement.style.position = 'absolute';
            this._cssRenderer.domElement.style.top = '0';
            this._cssRenderer.domElement.style.left = '0';
            this._cssRenderer.domElement.style.pointerEvents = 'none';

            this._wrapperContainer.appendChild(this._cssRenderer.domElement);
            this._wrapperContainer.appendChild(canvas);
        }

        setSize(w: number, h: number): void {
            super.setSize(w, h);
            this._cssRenderer.setSize(w, h);
        }

        afterRender() {
            super.afterRender();
            this._cssRenderer.render(this.scene, this.getCamera());
        }
    };
}
