import { ShaderLibShader, UniformsUtils } from 'three';

function cloneShader(shader: ShaderLibShader, newUniforms?: any, newDefines?: any): ShaderLibShader {
    const newShader = Object.assign({}, shader) as any;
    if (newDefines) {
        newShader.defines = Object.assign(newDefines, (shader as any).defines);
    }

    if (newUniforms) {
        newShader.uniforms = UniformsUtils.merge([shader.uniforms, newUniforms]);
    }

    if (!newShader.uniforms) {
        newShader.uniforms = {};
    }

    if (!(newShader as any).defines) {
        (newShader as any).defines = {};
    }

    return newShader;
}

function applyMixins(base: any, mixinList: any[]) {
    let res = base;
    if (mixinList) {
        mixinList.forEach(mixin => (res = mixin(res)));
    }
    return res;
}

export { cloneShader, applyMixins };
