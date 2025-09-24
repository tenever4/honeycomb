import { ShaderMaterial, Texture } from "three";
import { ColorMapLUT, lutFragmentShaders } from "./colormaps";
import { ColorMap, ColorMapType, ThresholdsColorMap } from "./ColorMapEditor";
import { isNumber } from "lodash";
import { ThresholdsMode } from "@grafana/data";

function fragmentFromColormap(colorMapFrag: string): string {
    return `
            uniform float opacity;
            uniform sampler2D tex;
            in vec2 vUv;

${colorMapFrag}

            void main() {
                float raw = texture( tex, vUv ).r;

                // // Apply the colormap
                vec4 mapped = colormap(raw);

                // Apply the opacity and return the color
                gl_FragColor = vec4(mapped.xyz, mapped.a * opacity);
            }`;
}

export function parseColor(colorRaw: string): [r: number, g: number, b: number, a: number] {
    const m = /^\#([A-Fa-f\d]+)$/.exec(colorRaw);
    if (!m) {
        console.warn('Invalid color', m);
        return [0, 0, 0, 1];
    }

    // hex color

    const hex = m[1];
    const size = hex.length;

    if (size === 3) {

        // #ff0
        return [
            parseInt(hex.charAt(0), 16) / 15,
            parseInt(hex.charAt(1), 16) / 15,
            parseInt(hex.charAt(2), 16) / 15,
            1.0
        ];

    } else if (size === 6) {

        // #ff0000

        const hexN = Math.floor(parseInt(hex, 16));

        return [
            (hexN >> 16 & 255) / 255,
            (hexN >> 8 & 255) / 255,
            (hexN & 255) / 255,
            1.0
        ];

    } else if (size === 8) { // hex with alpha

        // #ff0000ff
        const hexN = Math.floor(parseInt(hex, 16));

        return [
            (hexN >> 24 & 255) / 255,
            (hexN >> 16 & 255) / 255,
            (hexN >> 8 & 255) / 255,
            (hexN & 255) / 255
        ];
    } else {
        console.warn('Invalid hex color', colorRaw);
        return [0, 0, 0, 1];
    }
}

function createFragmentShader(colorMap: ColorMap): string {
    switch (colorMap.type) {
        case ColorMapType.gnuplot: {
            console.warn("GNU PLOT is not implemented, using JET");
            return createFragmentShader({
                type: ColorMapType.lut,
                lut: ColorMapLUT.MATLAB_jet
            });
        }
        case ColorMapType.thresholds: {
            let ifStatements = '';
            const thresholds = colorMap.steps?.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

            let fallbackColor = parseColor('#000');
            const normalizeFactor = (colorMap as ThresholdsColorMap).mode === ThresholdsMode.Percentage ? 1 / 255.0 : 1;
            for (const thresh of thresholds ?? []) {
                const color = parseColor(thresh.color);
                if (isNumber(thresh.value) && isFinite(thresh.value)) {
                    // TODO(tumbar) How are we supposed to normalize for non-U8[]
                    const normalizedThresh = thresh.value * normalizeFactor;

                    ifStatements += `
                    if (x >= ${Number.isInteger(normalizedThresh) ? normalizedThresh.toFixed(1) : normalizedThresh}) {
                        return vec4(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]});
                    }
                    `;
                } else {
                    fallbackColor = color;
                }
            }

            const colormapFrag = `
            vec4 colormap(float x) {
                ${ifStatements}

                return vec4(${fallbackColor[0]}, ${fallbackColor[1]}, ${fallbackColor[2]}, ${fallbackColor[3]});
        }
            `;

            return fragmentFromColormap(colormapFrag);
        }
        case ColorMapType.lut: {
            return fragmentFromColormap(lutFragmentShaders[colorMap.lut ?? ColorMapLUT.MATLAB_jet]);
        }
        default:
            console.warn('Invalid colormap, falling back to jet', colorMap);
            return createFragmentShader({
                type: ColorMapType.lut,
                lut: ColorMapLUT.MATLAB_jet
            });
    }
}

export class ColorMapMaterial extends ShaderMaterial {
    constructor(texture: Texture) {
        super({
            vertexShader: /* glsl */`
out vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
            fragmentShader: createFragmentShader({
                type: ColorMapType.lut,
                lut: ColorMapLUT.MATLAB_jet
            }),
            uniforms: {
                tex: { value: texture },
                opacity: { value: 1.0 }
            }
        });
    }

    // @ts-ignore Overriding property with get/set
    get opacity() {
        if (!this.uniforms) {
            return;
        }

        return this.uniforms.opacity.value;
    }

    set opacity(value) {
        if (!this.uniforms) {
            return;
        }

        this.uniforms.opacity.value = value;
    }

    updateColormap(colorMap: ColorMap) {
        // TODO(tumbar) Precompute the colormap into a 1D RBGA sampler
        // and pass that into a static fragment shader for runtime performance
        this.fragmentShader = createFragmentShader(colorMap);
        this.needsUpdate = true;
    }
}
