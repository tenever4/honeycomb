import { Mesh, SphereGeometry, ShaderMaterial, UniformsUtils, BackSide, Color, Vector3 } from 'three';
import { MarsSkyShader } from './MarsSkyShader';

type ColorChannel = "r" | "g" | "b";

const rgbKeys: [ColorChannel, ColorChannel, ColorChannel] = ['r', 'g', 'b'];
const SKY_COLORS = {
    YELLOW: 0xffeecc,
    ORANGE: 0xeeaa88,
    GRAY: 0x444444,
    BLACK: 0x000000,
    WHITE: 0xffffff,
};

const colorTwilight = new Color(SKY_COLORS.GRAY);
const colorZenith = new Color(SKY_COLORS.YELLOW);
const colorMidnight = new Color(SKY_COLORS.BLACK);
const normalizedDir = new Vector3();

/**
 * Initializes itself with a sphere and sky shader material.
 * @extends Mesh
 */
class MarsSky extends Mesh {
    /**
     * @member {Vector3}
     * Convenience getter for the {@link #MarsSkyShader MarsSkyShader} `sunPosition`
     * uniform value.
     */
    get sunPosition() {
        return (this.material as ShaderMaterial).uniforms.sunPosition.value;
    }

    constructor() {
        const shader = MarsSkyShader;
        const material = new ShaderMaterial({
            fragmentShader: shader.fragmentShader,
            vertexShader: shader.vertexShader,
            uniforms: UniformsUtils.clone(shader.uniforms),
            side: BackSide,
        });

        super(new SphereGeometry(1, 64, 64), material);
    }

    /**
     * Sets the target color object to the color of the ambient light
     * given the current sun angle.
     */
    getColor(target: Color): Color {
        // adjust ambient light based on sun position
        const sunVec = this.sunPosition;
        const el = -sunVec.z;
        rgbKeys.forEach(colorChannel => {
            if (el > 0) {
                target[colorChannel] =
                    colorTwilight[colorChannel] +
                    (colorZenith[colorChannel] - colorTwilight[colorChannel]) * Math.sin(el);
            } else {
                target[colorChannel] =
                    colorTwilight[colorChannel] +
                    (colorMidnight[colorChannel] - colorTwilight[colorChannel]) * Math.sin(-el);
            }
        });

        return target;
    }

    /**
     * Returns the intensity of the directional light given the current
     * sun position.
     * @returns {Number}
     */
    getDirectionalIntensity() {
        // make shadow intensity drop off near twilight and go away after sunset
        normalizedDir.copy(this.sunPosition).normalize();
        const el = -normalizedDir.z;
        return el > 0 ? 1 - Math.exp(-5 * el) : 0;
    }

    /**
     * Returns the intensity of the ambient light given the current sun position.
     * @returns {Number}
     */
    getAmbientIntensity() {
        // make shadow intensity drop off near twilight and go away after sunset
        normalizedDir.copy(this.sunPosition).normalize();
        const el = -normalizedDir.z;
        return (el > 0 ? 1 - Math.exp(-0.05 * el) : 0) + 0.3;
    }
}

export { MarsSky, MarsSkyShader };
