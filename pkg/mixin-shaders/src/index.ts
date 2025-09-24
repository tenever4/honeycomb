import { ExtendedShaderMaterial } from './ExtendedShaderMaterial';
import { WorldUnitsPointsShader } from './WorldUnitsPointsShader';
import { ScreenPlaneShader } from './ScreenPlaneShader';
import { cloneShader, applyMixins } from './utils';
import * as Mixins from './shaderMixins';

// TODO: Remove this
function getMaterialClass(base: any, mixinList?: any) {
    return ExtendedShaderMaterial.createClass(base, mixinList);
}

const Shaders = {
    WorldUnitsPointsShader,
    ScreenPlaneShader,
};

export { ExtendedShaderMaterial, getMaterialClass, applyMixins, cloneShader, Mixins, Shaders };
