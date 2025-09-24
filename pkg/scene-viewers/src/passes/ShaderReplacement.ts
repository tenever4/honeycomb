/* eslint-disable */
// from https://raw.githubusercontent.com/gkjohnson/threejs-sandbox/master/shader-replacement/src/ShaderReplacement.js

import { Material, Object3D, Scene, ShaderMaterial, ShaderMaterialParameters } from 'three';

export interface Object3DMaterial extends Object3D {
    isMesh?: boolean;
    isSkinnedMesh?: boolean;
    material?: Material;

    traverse(callback: (object: Object3DMaterial) => any): void;
}

const _originalMaterials = new WeakMap();
const _originalLayers = new WeakMap();
export class ShaderReplacement {
    _replacementMaterial: ShaderMaterial;
    _replacementMaterials: WeakMap<object, Material>;

    constructor(shader?: ShaderMaterialParameters) {
        this._replacementMaterial = new ShaderMaterial(shader);
        this._replacementMaterials = new WeakMap();
    }

    replace(scene: Scene | Scene[], recursive: boolean = false, cacheCurrentMaterial = true, cacheCurrentLayer = true) {
        const scope = this;

        function applyMaterial(obj: Object3DMaterial) {
            if (!obj.isMesh && !obj.isSkinnedMesh) {
                return;
            }

            if (!replacementMaterials.has(obj)) {
                const replacementMaterial = scope.createMaterial(obj);
                replacementMaterials.set(obj, replacementMaterial);
            }

            const replacementMaterial = replacementMaterials.get(obj);
            if (!replacementMaterial) {
                return;
            }

            let originalMaterial = obj.material;
            if (cacheCurrentMaterial) {
                originalMaterials.set(obj, originalMaterial);
            } else {
                originalMaterial = originalMaterials.get(obj);
            }

            if (!originalMaterial) {
                console.error('ShaderReplacement : Material for object was not cached before replacing shader.', obj);
            } else {
                scope.updateUniforms(originalMaterial, replacementMaterial);
            }

            obj.material = replacementMaterial;
        }
        
        function saveLayers(obj: Object3D) {
            _originalLayers.set(obj, obj.layers.mask);
        }

        const replacementMaterials = this._replacementMaterials;
        const originalMaterials = _originalMaterials;
        if (Array.isArray(scene)) {
            if (recursive) {
                for (let i = 0, l = scene.length; i < l; i++) {
                    scene[i].traverse(applyMaterial);
                    if (cacheCurrentLayer) scene[i].traverse(saveLayers);
                }
            } else {
                for (let i = 0, l = scene.length; i < l; i++) {
                    applyMaterial(scene[i]);
                    if (cacheCurrentLayer) saveLayers(scene[i]);
                }
            }
        } else {
            if (recursive) {
                scene.traverse(applyMaterial);
                if (cacheCurrentLayer) scene.traverse(saveLayers);
            } else {
                applyMaterial(scene);
                if (cacheCurrentLayer) saveLayers(scene);
            }
        }
    }

    reset(scene: Scene | Scene[], recursive: boolean) {
        function resetMaterial(obj: Object3DMaterial) {
            if (originalMaterials.has(obj)) {
                obj.material = originalMaterials.get(obj);
                originalMaterials.delete(obj);
            } else if (obj.isSkinnedMesh || obj.isMesh) {
                console.error('ShaderReplacement : Material for object was not cached before resetting.', obj);
            }
        }

        function resetLayer(obj: Object3D) {
            if (_originalLayers.has(obj)) {
                obj.layers.mask = _originalLayers.get(obj);
            }
        }

        const originalMaterials = _originalMaterials;
        if (Array.isArray(scene)) {
            if (recursive) {
                for (let i = 0, l = scene.length; i < l; i++) {
                    resetMaterial(scene[i]);
                    resetLayer(scene[i]);
                }
            } else {
                for (let i = 0, l = scene.length; i < l; i++) {
                    scene[i].traverse(resetMaterial);
                    scene[i].traverse(resetLayer);
                }
            }
        } else {
            if (recursive) {
                scene.traverse(resetMaterial);
                scene.traverse(resetLayer);
            } else {
                resetMaterial(scene);
                resetLayer(scene);
            }
        }
    }

    createMaterial(obj: any): Material {
        return this._replacementMaterial.clone();
    }

    updateUniforms(material: Material, target: Material) {
        const replacementMaterial = this._replacementMaterial;
        const originalDefines = replacementMaterial.defines;
        const materialDefines = material.defines;
        const targetDefines = target.defines || {};

        target.side = material.side;
        (target as any).flatShading = (material as any).flatShading;
        (target as any).skinning = (material as any).skinning;

        if (materialDefines) {
            for (const key in materialDefines) {
                if (key in materialDefines && materialDefines[key] !== targetDefines[key]) {
                    targetDefines[key] = materialDefines[key];
                    target.needsUpdate = true;
                }
            }

            for (const key in targetDefines) {
                if (!(key in materialDefines)) {
                    if (key in originalDefines) {
                        if (originalDefines[key] !== targetDefines[key]) {
                            targetDefines[key] = originalDefines[key];
                            target.needsUpdate = true;
                        }
                    } else {
                        delete targetDefines[key];
                        target.needsUpdate = true;
                    }
                } else if (materialDefines[key] !== targetDefines[key]) {
                    targetDefines[key] = materialDefines[key];
                    target.needsUpdate = true;
                }
            }
        }

        // NOTE: we shouldn't have to worry about using copy / equals on colors, vectors, or arrays here
        // because we promise not to change the values.
        const targetUniforms = (target as any).uniforms;
        if ((material as any).isShaderMaterial) {
            const materialUniforms = (material as any).uniforms;
            for (const key in targetUniforms) {
                const materialUniform = materialUniforms[key];
                const targetUniform = targetUniforms[key];
                if (materialUniform && materialUniform.value !== targetUniform.value) {
                    targetUniform.value = materialUniform.value;
                    if (targetUniform.value.isTexture) {
                        target.needsUpdate = true;
                    }
                }
            }
        } else {
            for (const key in targetUniforms) {
                const targetUniform = targetUniforms[key];
                if (key in material && (material as any)[key] !== targetUniform.value) {
                    targetUniform.value = (material as any)[key];
                    if (targetUniform.value.isTexture) {
                        target.needsUpdate = true;
                    }
                }
            }
        }
    }

    dispose() {
        // TODO: include disposal?
    }
}
