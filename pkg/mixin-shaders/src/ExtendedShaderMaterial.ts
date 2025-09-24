import { ShaderMaterial, UniformsUtils } from 'three';
import { applyMixins } from './utils';

class ExtendedShaderMaterial extends ShaderMaterial {
    binnedPointsScale: number = 0;
    size: number = 0;

    static createClass(base: any, mixinList?: any) {
        const res = applyMixins(base, mixinList);

        return class extends ExtendedShaderMaterial {
            constructor(options: any) {
                super(res, options);
            }
        };
    }

    constructor(definition: any, options?: any) {
        const clonedDefinition = Object.assign({}, definition);
        clonedDefinition.uniforms = UniformsUtils.clone(definition.uniforms);
        clonedDefinition.defines = Object.assign({}, clonedDefinition.defines);

        const ogUniforms = definition.uniforms;
        for (const name in ogUniforms) {
            if (ogUniforms[name].value && ogUniforms[name].value.isTexture) {
                clonedDefinition.uniforms[name].value.dispose();
                clonedDefinition.uniforms[name].value = ogUniforms[name].value;
            }
        }

        super(clonedDefinition);

        for (const u in this.uniforms) {
            Object.defineProperty(this, u, {
                get: () => this.uniforms[u].value,
                set: val => {
                    const uniform = this.uniforms[u];
                    if (typeof uniform.value === 'object') {
                        if (typeof val === 'number') {
                            uniform.value.set(val);
                        } else {
                            uniform.value = val;
                        }
                    } else {
                        uniform.value = val;
                    }
                },
            });
        }

        this.defines = new Proxy(this.defines, {
            has: (target, key) => {
                return key in target;
            },
            get: (target, key: string) => {
                return target[key];
            },
            set: (target, key: string, val) => {
                if (target[key] !== val) {
                    target[key] = val;
                    this.needsUpdate = true;
                }
                return true;
            },
            deleteProperty: (target, key: string) => {
                if (key in target) {
                    delete target[key];
                    this.needsUpdate = true;
                }
                return true;
            },
        });

        // TODO: temporary deprecation warning
        for (const d in this.defines) {
            Object.defineProperty(this, d, {
                get: () => this.defines[d],
                set: () => {
                    console.warn(
                        `ExtendedShaderMaterial: Setting define for ${d} directly on material object is no longer supported.`,
                    );
                },
            });
        }

        for (const o in options) {
            const value = options[o];
            if (o in this) {
                (this as any)[o] = value;
            }
        }

        // Automatically detect if lights should be passed into the material
        // Compare to getProgram() in three.js's src/renderers/WebGLRenderer.js
        // TODO: when upgrading three, check these parameter names below
        // Keyword search help: "three": "^0.169.0"
        this.lights =
            'directionalLights' in ogUniforms &&
            'directionalShadowMap' in ogUniforms &&
            'directionalShadowMatrix' in ogUniforms &&
            'pointLights' in ogUniforms &&
            'pointShadowMap' in ogUniforms &&
            'pointShadowMatrix' in ogUniforms &&
            'spotLights' in ogUniforms &&
            'spotShadowMap' in ogUniforms &&
            'spotLightMatrix' in ogUniforms &&
            'spotLightMap' in ogUniforms;

        this.fog = true;
    }

    copy(material: ShaderMaterial) {
        super.copy(material);

        const otherUniforms = material.uniforms;
        const uniforms = this.uniforms;
        for (const name in uniforms) {
            if (otherUniforms) {
                if (name in otherUniforms) {
                    (this as any)[name] = otherUniforms[name].value;
                }
            } else {
                if (name in material) {
                    (this as any)[name] = (material as any)[name];
                }
            }
        }

        return this;
    }
}

export { ExtendedShaderMaterial };
