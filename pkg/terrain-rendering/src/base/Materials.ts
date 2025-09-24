import { cloneShader, applyMixins, Mixins } from '@gov.nasa.jpl.honeycomb/mixin-shaders';
import { TextureStampMixin } from '@gov.nasa.jpl.honeycomb/mixin-shaders/src/shaderMixins';
import { Vector2, DataTexture, RGBAFormat, ShaderLibShader } from 'three';
const {
    SteepnessShaderMixin,
    SteepnessClipShaderMixin,
    SlopeShaderMixin,
    ColorRampShaderMixin,
    TopoLineShaderMixin,
    DitheredTransparencyShaderMixin,
    ClipPlaneMixin,
} = Mixins;

function createCircleTexture(res: number) {
    const data = new Uint8Array(res * res * 4);
    const vec = new Vector2();
    for (let x = 0; x < res; x++) {
        for (let y = 0; y < res; y++) {
            vec.x = x / (res - 1) - 0.5;
            vec.y = y / (res - 1) - 0.5;

            const i = (y * res + x) * 4;
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            if (vec.length() < 0.5) {
                data[i + 3] = 255;
            }
        }
    }

    const tex = new DataTexture(data, res, res, RGBAFormat);
    tex.anisotropy = 1;

    tex.needsUpdate = true;
    return tex;
}

const circleTexture = createCircleTexture(128);

// Returns a shader with a variety of code mixed in for rendering terrain features
// including clipping, steepness, topolines, and more.ß
function MeshShaderMixin(shader: ShaderLibShader) {
    return applyMixins(shader, [
        ClipPlaneMixin,
        DitheredTransparencyShaderMixin,
        SteepnessClipShaderMixin,
        SteepnessShaderMixin,
        SlopeShaderMixin,
        TopoLineShaderMixin,
        ColorRampShaderMixin,
        TextureStampMixin
    ]);
}

// Creates a copyo of the given shader with some reasonable defaults set
function PointsShaderMixin(shader: ShaderLibShader) {
    shader = cloneShader(shader);
    shader.uniforms.map.value = circleTexture;
    shader.uniforms.scale.value = 1000;
    (shader as any).defines.USE_SIZEATTENUATION = 1;
    return shader;
}

export { MeshShaderMixin, PointsShaderMixin };
