import { Viewer } from './Viewer';
import { PixelOutlinePass } from './passes/PixelOutlinePass';
import { Color, Object3D, Scene } from 'three';

type Constructor = new (...args: any) => Viewer & { dirty: boolean };
export function SelectionViewerMixin<TBase extends Constructor>(base: TBase) {
    return class extends base {
        fullOutlinePass: PixelOutlinePass;
        visibleOutlinePass: PixelOutlinePass;
        selectionColor: Color;

        constructor(...args: any) {
            super(...args);

            const fullOutlinePass = new PixelOutlinePass(this.getCamera());
            fullOutlinePass.opacity = 0.4;
            fullOutlinePass.enabled = false;

            const visibleOutlinePass = new PixelOutlinePass(this.getCamera());
            visibleOutlinePass.renderDepth = true;

            // TODO(tumbar) Do we need to change this to 'this.scene'?
            visibleOutlinePass.scene = this.world as unknown as Scene;
            visibleOutlinePass.enabled = false;

            const composer = this.composer;
            composer.insertPass(fullOutlinePass, composer.passes.length - 2);
            composer.insertPass(visibleOutlinePass, composer.passes.length - 2);

            this.fullOutlinePass = fullOutlinePass;
            this.visibleOutlinePass = visibleOutlinePass;
            this.selectionColor = new Color(0xffb300).convertSRGBToLinear();

            this.addEventListener('before-render', () => {
                fullOutlinePass.camera = this.getCamera();
                visibleOutlinePass.camera = this.getCamera();
            });
        }

        addSelection(obj: Object3D) {
            const selectionColor = this.selectionColor;
            const visibleOutlinePass = this.visibleOutlinePass;
            const fullOutlinePass = this.fullOutlinePass;

            visibleOutlinePass.setOutline(selectionColor, [obj]);
            fullOutlinePass.setOutline(selectionColor, [obj]);

            visibleOutlinePass.enabled = true;
            fullOutlinePass.enabled = true;
            this.dirty = true;
        }

        removeSelection(obj: Object3D) {
            const visibleOutlinePass = this.visibleOutlinePass;
            const fullOutlinePass = this.fullOutlinePass;

            visibleOutlinePass.removeOutline([obj]);
            fullOutlinePass.removeOutline([obj]);

            if (visibleOutlinePass.objects.length === 0) {
                visibleOutlinePass.enabled = false;
                fullOutlinePass.enabled = false;
            }
            this.dirty = true;
        }
    };
}
