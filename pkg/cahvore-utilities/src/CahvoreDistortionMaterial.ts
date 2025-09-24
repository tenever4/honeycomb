import { Matrix4, ShaderMaterial, ShaderMaterialParameters, Texture, Vector3 } from 'three';
import { cahvoreUnprojectShader } from './shader/cahvoreDistortionShader';
import { getLinearFrustumInfo, frameBoundsToProjectionMatrix } from './utils';

import { CameraDefinition, CameraModelType } from '@gov.nasa.jpl.honeycomb/camera-loader';

export class CahvoreDistortionMaterial extends ShaderMaterial {
    get C(): Vector3 { return this.uniforms["C"].value; }
    get A(): Vector3 { return this.uniforms["A"].value; }
    get H(): Vector3 { return this.uniforms["H"].value; }
    get V(): Vector3 { return this.uniforms["V"].value; }
    get O(): Vector3 { return this.uniforms["O"].value; }
    get R(): Vector3 { return this.uniforms["R"].value; }
    get E(): Vector3 { return this.uniforms["E"].value; }

    get maxFoV(): number { return this.uniforms["maxFoV"].value; }
    get inverseFrame(): Matrix4 { return this.uniforms["inverseFrame"].value; }
    get cahvoreProjectionMatrix(): Matrix4 { return this.uniforms["cahvoreProjectionMatrix"].value; }

    get imageWidth(): number { return this.uniforms["imageWidth"].value; }
    set imageWidth(v: number) { this.uniforms["imageWidth"].value = v; }

    get imageHeight(): number { return this.uniforms["imageHeight"].value; }
    set imageHeight(v: number) { this.uniforms["imageHeight"].value = v; }

    get linearity(): number { return this.uniforms["linearity"].value; }
    set linearity(v: number) { this.uniforms["linearity"].value = v; }

    get tex(): Texture | null { return this.uniforms['tex'].value; }
    set tex(v: Texture | null) {
        if (this.uniforms['tex'] === null) {
            this.needsUpdate = true;
        }
        this.uniforms['tex'].value = v;
    }

    constructor(parameters?: ShaderMaterialParameters) {
        super(cahvoreUnprojectShader);

        if (parameters) {
            this.setValues(parameters);
        }
    }

    setModelType(modelType: CameraModelType) {
        if (this.defines.MODEL_TYPE !== modelType) {
            this.needsUpdate = true;
        }

        this.defines.MODEL_TYPE = modelType;
    }

    setFromCameraModel(model: CameraDefinition) {
        this.setModelType(model.type);
        this.C.copy(model.C);
        this.A.copy(model.A);
        this.H.copy(model.H);
        this.V.copy(model.V);
        if (model.O) this.O.copy(model.O);
        if (model.R) this.R.copy(model.R);
        if (model.E) this.E.copy(model.E);

        this.imageWidth = model.width;
        this.imageHeight = model.height;
        this.linearity = model.linearity;

        const info = getLinearFrustumInfo(model);
        const { maxFrameBounds, frame } = info;
        this.inverseFrame.copy(frame).invert();

        frameBoundsToProjectionMatrix(maxFrameBounds, 1.0, 2.0, this.cahvoreProjectionMatrix);
    }
}
