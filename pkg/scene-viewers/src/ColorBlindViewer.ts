import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Viewer } from './Viewer';

// Color Blindness Constants
export enum ColorBlindMode {
    NONE = 0,
    DEUTERANOPIA = 1,
    PROTANOPIA = 2,
    TRITANOPIA = 3
}

// References
// http://web.archive.org/web/20081014161121/http://www.colorjack.com/labs/colormatrix/
// http://mapeper.github.io/jsColorblindSimulator/
// https://github.com/gkjohnson/threejs-sandbox/tree/master/colorblindness-utils @ commit 6d4f12a
const ColorBlindShader = {
    uniforms: {
        tDiffuse: { value: null },
    },

    vertexShader: `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}
	`,

    fragmentShader: `
		varying vec2 vUv;
		uniform sampler2D tDiffuse;
		void main() {
			vec3 rgb = texture2D( tDiffuse, vUv ).rgb;
			mat3 dMat;
			dMat[0] = vec3(0.625, 0.375, 0.0);
			dMat[1] = vec3(0.7, 0.3, 0.0);
			dMat[2] = vec3(0.0, 0.3, 0.7);
			mat3 pMat;
			pMat[0] = vec3(0.56667, 0.43333, 0.0);
			pMat[1] = vec3(0.55833, 0.44167, 0.0);
			pMat[2] = vec3(0.0, 0.24167, 0.75833);
			mat3 tMat;
			tMat[0] = vec3(0.95, 0.05, 0.0);
			tMat[1] = vec3(0.0, 0.43333, 0.56667);
			tMat[2] = vec3(0.0, 0.475, 0.525);
			vec3 res = rgb;
			#if (MODE == 1)
			res = dMat * rgb;
			#elif (MODE == 2)
			res = pMat * rgb;
			#elif (MODE == 3)
			res = tMat * rgb;
			#endif
			gl_FragColor = vec4(res, 1.0);
		}
	`,
};

type Constructor = new (...args: any) => Viewer & { dirty: boolean };
export function ColorBlindViewerMixin<TBase extends Constructor>(base: TBase) {
    return class extends base {
        private colorBlindPass?: ShaderPass;
        private _colorBlindMode: ColorBlindMode;

        set colorBlindMode(val: ColorBlindMode) {
            switch (val) {
                case ColorBlindMode.NONE:
                    if (this.colorBlindPass) {
                        this.composer.removePass(this.colorBlindPass);
                    }
                    this.colorBlindPass = undefined;
                    break;
                case ColorBlindMode.DEUTERANOPIA:
                case ColorBlindMode.PROTANOPIA:
                case ColorBlindMode.TRITANOPIA: {
                    const colorBlindPass = new ShaderPass(ColorBlindShader);
                    this.composer.addPass(colorBlindPass);
                    this.colorBlindPass = colorBlindPass;
                }
                    break;
                default:
                    throw new Error(`ColorBlindViewer: unknown color blind mode: ${val}`);
            }

            this._colorBlindMode = val;
            this.dirty = true;
        }

        get colorBlindMode() {
            return this._colorBlindMode;
        }

        readonly isColorBlindViewer = true;

        constructor(...args: any) {
            super(...args);

            this.isColorBlindViewer = true;
            this._colorBlindMode = ColorBlindMode.NONE;
        }

        render() {
            if (this.colorBlindPass) {
                if (this.colorBlindPass.material.defines.MODE !== this._colorBlindMode) {
                    this.colorBlindPass.material.defines.MODE = this._colorBlindMode;
                    this.colorBlindPass.material.needsUpdate = true;
                }
            }
            super.render();
        }
    };
}
