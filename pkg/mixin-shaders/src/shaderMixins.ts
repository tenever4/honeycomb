import {
    Color,
    Vector2,
    Vector3,
    Vector4,
    DataTexture,
    RedFormat,
    FloatType,
    RepeatWrapping,
    NearestFilter,
    Matrix4,
    ShaderLibShader,
} from 'three';

import { cloneShader } from './utils';
import { ParulaColormapLinear } from './colormaps';

/** NOTES:
 * "transformed" in vertex shaders is declared in the begin_vertex shader chunk: 
 * https://github.com/mrdoob/three.js/blob/a2e9ee8204b67f9dca79f48cf620a34a05aa8126/src/renderers/shaders/ShaderChunk/begin_vertex.glsl.js#L2
 */

// - Dither texture
const data = new Float32Array(16);
data[0] = 1.0 / 17.0;
data[1] = 9.0 / 17.0;
data[2] = 3.0 / 17.0;
data[3] = 11.0 / 17.0;

data[4] = 13.0 / 17.0;
data[5] = 5.0 / 17.0;
data[6] = 15.0 / 17.0;
data[7] = 7.0 / 17.0;

data[8] = 4.0 / 17.0;
data[9] = 12.0 / 17.0;
data[10] = 2.0 / 17.0;
data[11] = 10.0 / 17.0;

data[12] = 16.0 / 17.0;
data[13] = 8.0 / 17.0;
data[14] = 14.0 / 17.0;
data[15] = 6.0 / 17.0;

const ditherTex = new DataTexture(data, 4, 4, RedFormat, FloatType);
ditherTex.minFilter = NearestFilter;
ditherTex.magFilter = NearestFilter;
ditherTex.anisotropy = 1;
ditherTex.wrapS = RepeatWrapping;
ditherTex.wrapT = RepeatWrapping;

ditherTex.needsUpdate = true;

// add world position as 'wPosition' to the shader
function addWorldPosition(shader: ShaderLibShader) {
    if (/varying\s+vec3\s+wPosition/.test(shader.vertexShader)) return;

    shader.vertexShader = `
        varying vec3 wPosition;
        ${shader.vertexShader}
        `.replace(
        /#include <worldpos_vertex>/,
        v =>
            `${v}

            wPosition = (modelMatrix * vec4( transformed, 1.0 )).xyz;
            `,
    );

    shader.fragmentShader = `
        varying vec3 wPosition;
        ${shader.fragmentShader}
        `;

    return shader;
}

// TODO: Use a texture to do this to take advantage of filtering
function GridClipMixin(shader: ShaderLibShader) {
    const defineKeyword = 'ENABLE_GRID_CLIP';
    const newShader = cloneShader(
        shader,
        {
            gridSize: { value: 1 },
            gridThickness: { value: 0.1 },
            gridOffset: { value: new Vector3(0, 0, 0) },
        },
        {
            [defineKeyword]: 0,
        },
    );

    addWorldPosition(newShader);

    newShader.fragmentShader = `
        uniform float gridSize;
        uniform float gridThickness;
        uniform vec3 gridOffset;

        ${newShader.fragmentShader}
        `.replace(
        /main\s*\(\)\s*{/,
        v =>
            `${v}
            #if ${defineKeyword}
            {
                vec3 gridSize3 = vec3(1,1,1) * gridSize;
                vec3 gridThickness3 = vec3(1,1,1) * gridThickness;
                vec3 pos = mod(wPosition.xyz + gridOffset, gridSize3);
                vec3 minStep = step(gridThickness3, pos);
                vec3 maxStep = step(gridThickness3, gridSize3 - pos);

                bvec3 minInside = greaterThan(minStep, vec3(0, 0, 0));
                bvec3 maxInside = greaterThan(maxStep, vec3(0, 0, 0));
                bool isInside = all(minInside.xz) && all(maxInside.xz);

                if (isInside) discard;
            }
            #endif
            `,
    );

    return newShader;
}

// Plane Clip Uniforms
// - clip-plane
function ClipPlaneMixin(shader: ShaderLibShader) {
    const defineKeyword = 'ENABLE_CLIP_PLANE';
    const newShader = cloneShader(
        shader,
        {
            clipPlane: { value: new Vector4(0, 1, 0, 0) },
        },
        {
            [defineKeyword]: 0,
        },
    );

    addWorldPosition(newShader);

    newShader.fragmentShader = `
        uniform vec4 clipPlane;

        ${newShader.fragmentShader}
        `.replace(
        /main\s*\(\)\s*{/,
        v =>
            `${v}
            #if ${defineKeyword}
            {
                float clipDist = clipPlane.w;
                vec3 clipNorm = clipPlane.xyz;
                float fragDist = dot(clipNorm, wPosition.xyz);
                if (fragDist > clipDist) discard;
            }
            #endif
            `,
    );
    return newShader;
}

function SlopeShaderMixin(shader: ShaderLibShader) {
    const defineKeyword = 'ENABLE_SLOPE_ANGLE_VISUALIZATION';
    const newShader = cloneShader(
        shader,
        {
            maxDotProduct: { value: Math.cos(30 * Math.PI / 180) }, // cosine 30 degrees
            worldReferenceDirection: { value: new Vector3(0, 1, 0) },
            colormap: { value: ParulaColormapLinear },
        },
        {
            [defineKeyword]: 0,
        },
    );

    newShader.fragmentShader = `
        uniform vec3 worldReferenceDirection;
        uniform float maxDotProduct;
        uniform vec3 colormap[256];

        ${newShader.fragmentShader}
        `.replace(
            // place our code somewhere *after* lighting has been applied
            // so that we can effectively ignore lighting by directly
            // setting the final color (i.e., gl_FragColor)
            /#include <dithering_fragment>/,
            v =>
            `${v}
            #if ${defineKeyword}
            {
                // "normal" is in view space coordinates so we need to transform
                // the worldReferenceDirection into view space coordinates to 
                // calculate the dot product in the same coordinate frame.
                vec3 vUp = normalize((viewMatrix * vec4(worldReferenceDirection, 0)).xyz);
                float steepness = dot(normal, vUp);

                // remap steepness into a 0 to 1 range
                if (maxDotProduct == 1.) { // avoid division by zero
                    gl_FragColor = mix(gl_FragColor, vec4(colormap[255], 1.), opacity);
                } else {
                    float remappedSteepness = clamp((clamp(steepness, 0., 1.) - maxDotProduct) / (1. - maxDotProduct), 0., 1.);
    
                    // get appropriate index into the color map
                    int index = 255 - int(floor(remappedSteepness * 255.));
    
                    gl_FragColor = mix(gl_FragColor, vec4(colormap[index], 1.), opacity);
                }
            }
            #endif
            `,
    );

    return newShader;
}

// Steepness Representation Uniforms
// - high-steepness color
// - steepness cutoff
function SteepnessShaderMixin(shader: ShaderLibShader) {
    // TODO: This should use flat normals if not automatically provided for computing
    // steepness. Should share _vViewPosition varying with SteepnessClipShaderMixin.
    const defineKeyword = 'ENABLE_STEEPNESS_VISUALIZATION';
    const newShader = cloneShader(
        shader,
        {
            steepnessColor: { value: new Color() },
            maxSteepness: { value: 0.5 },
            steepnessColorVector: { value: new Vector3(0, 1, 0) },
        },
        {
            [defineKeyword]: 0,
        },
    );

    newShader.fragmentShader = `
        uniform vec3 steepnessColor;
        uniform vec3 steepnessColorVector;
        uniform float maxSteepness;

        ${newShader.fragmentShader}
        `.replace(
        /#include <normal_fragment_maps>/,
        v =>
            `${v}
            #if ${defineKeyword}
            {
                // "normal" is in view space coordinates so we need to transform
                // the worldReferenceDirection into view space coordinates
                vec3 vUp = normalize((viewMatrix * vec4(steepnessColorVector, 0)).xyz);
                //float steepness = dot(normal, steepnessColorVector); // looks cool but is not correct :)
                float steepness = dot(normal, vUp);
                float isTooSteep = step(maxSteepness, steepness);
                diffuseColor = mix(vec4(steepnessColor, 1.), diffuseColor, isTooSteep);
            }
            #endif
            `,
    );

    return newShader;
}

// Steepness Clip Uniforms
// - steepness-clip-cutoff
// - steepness-compare-vector
function SteepnessClipShaderMixin(shader: ShaderLibShader) {
    const defineKeyword = 'ENABLE_STEEPNESS_CLIP';
    const newShader = cloneShader(
        shader,
        {
            steepnessClip: { value: 0.001 },
            steepnessClipVector: { value: new Vector3(0, 1, 0) },
        },
        {
            [defineKeyword]: 0,
        },
    );

    newShader.vertexShader = `
        #ifndef FLAT_SHADED
        varying vec3 _vViewPosition;
        #endif

        ${newShader.vertexShader}
        `.replace(
        /#include <worldpos_vertex>/,
        v =>
            `
            {
                #ifndef FLAT_SHADED
                _vViewPosition = - mvPosition.xyz;
                #endif
            }
            ${v}
            `
    );

    newShader.fragmentShader = `
    uniform float steepnessClip;
    uniform vec3 steepnessClipVector;

    #ifndef FLAT_SHADED
    varying vec3 _vViewPosition;
    #endif

    ${newShader.fragmentShader}
    `.replace(
        /#include <normal_fragment_maps>/,
        v =>
            `${v}
        #if ${defineKeyword}
        {
            vec3 vUp = normalize((viewMatrix * vec4(steepnessClipVector, 0)).xyz);

            #ifdef FLAT_SHADED
            float steepness = abs(dot(normal, vUp));
            #else
            vec3 fdx = vec3(dFdx(_vViewPosition.x), dFdx(_vViewPosition.y), dFdx(_vViewPosition.z));
            vec3 fdy = vec3(dFdy(_vViewPosition.x), dFdy(_vViewPosition.y), dFdy(_vViewPosition.z));
            vec3 flatNormal = normalize(cross(fdx,fdy));

            float steepness = abs(dot(flatNormal, vUp));
            #endif

            float isTooSteep = step(steepnessClip, steepness);
            if (isTooSteep < 0.5) discard;
        }
        #endif
        `,
    );

    return newShader;
}

// Texture Stamp Uniforms
// - textureStampMap${suffix}
// - textureStampFrameInverse${suffix}
// - textureStampOpacity${suffix}
// - textureStampDitherTex${suffix}
// - textureStampDitherOpacity${suffix}
function TextureStampMixin(shader: ShaderLibShader, suffix: string = '') {
    const defineKeyword = `ENABLE_TEXTURE_STAMP${suffix}`;
    const enableDitherKeyword = `ENABLE_TEXTURE_STAMP_DITHER${suffix}`;
    const useModelCoordinatesKeyword = `ENABLE_TEXTURE_STAMP_USE_MODEL_COORDINATES${suffix}`;

    const newShader = cloneShader(
        shader,
        {
            [`textureStampMap${suffix}`]: { value: null },
            [`textureStampFrameInverse${suffix}`]: { value: new Matrix4() },
            [`textureStampOpacity${suffix}`]: { value: 1.0 },
            [`textureStampDitherTex${suffix}`]: { value: ditherTex },
            [`textureStampDitherOpacity${suffix}`]: { value: 1.0 },
        },
        {
            [defineKeyword]: 0,
            [enableDitherKeyword]: 0,
            [useModelCoordinatesKeyword]: 0,
        },
    );

    newShader.vertexShader = `
    uniform mat4 textureStampFrameInverse${suffix};
    varying vec2 stampUV${suffix};

    ${newShader.vertexShader}
    `.replace(
        /#include <worldpos_vertex>/,
        v =>
            `${v}
        #if ${defineKeyword}
        {
            #if ${useModelCoordinatesKeyword}
            {
                stampUV${suffix} = (textureStampFrameInverse${suffix} * vec4(transformed, 1.0)).xy;
            }
            #else
            {
                vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
                stampUV${suffix} = (textureStampFrameInverse${suffix} * worldPosition).xy + vec2(0.5, 0.5);
            }
            #endif
        }
        #endif
        `,
    );

    newShader.fragmentShader = `
    uniform sampler2D textureStampMap${suffix};
    uniform sampler2D textureStampDitherTex${suffix};
    uniform float textureStampDitherOpacity${suffix};
    uniform float textureStampOpacity${suffix};
    varying vec2 stampUV${suffix};

    ${newShader.fragmentShader}
    `.replace(
        /#include <map_fragment>/,
        v =>
            `${v}
        #if ${defineKeyword}
        {

            vec4 texColor = texture2D(textureStampMap${suffix}, stampUV${suffix});
            texColor.rgb *= textureStampOpacity${suffix};

            // check if the uv is within [0.0, 1.0]
            vec4 uvEquality = step(vec4(0, 0, stampUV${suffix}.xy), vec4(stampUV${suffix}.xy, 1.0, 1.0));
            float isInside = step(4.0, uvEquality.x + uvEquality.y + uvEquality.z + uvEquality.w);

            texColor *= float(isInside);
            diffuseColor = mix(diffuseColor, texColor, texColor.a);

            #if ${enableDitherKeyword}

            if(texture2D(textureStampDitherTex${suffix}, gl_FragCoord.xy / 4.0).r > textureStampDitherOpacity${suffix} && texColor.a == 1.0) discard;

            #endif

        }
        #endif
        `,
    );

    return newShader;
}

function GridStampMixin(shader: ShaderLibShader, suffix: string) {
    const defineKeyword = `ENABLE_GRID_STAMP${suffix}`;

    const newShader = cloneShader(
        shader,
        {
            [`gridStampFrameInverse${suffix}`]: { value: new Matrix4() },
            [`gridStampOpacity${suffix}`]: { value: 1.0 },
            [`gridResolution${suffix}`]: { value: new Vector2() },
            [`gridLineThickness${suffix}`]: { value: 0.02 },
            [`gridFadeStart${suffix}`]: { value: 40 },
            [`gridFadeDist${suffix}`]: { value: 20 },
        },
        {
            [defineKeyword]: 0,
        }
    );

    newShader.vertexShader = `
    uniform mat4 gridStampFrameInverse${suffix};
    varying vec2 gridStampUV${suffix};

    ${newShader.vertexShader}
    `.replace(
        /#include <worldpos_vertex>/,
        v =>
            `${v}
        #if ${defineKeyword}
        {
            vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
            gridStampUV${suffix} = (gridStampFrameInverse${suffix} * worldPosition).xy + vec2(0.5, 0.5);
        }
        #endif
        `
    );

    newShader.fragmentShader = `
    uniform float gridStampOpacity${suffix};
    uniform float gridFadeStart${suffix};
    uniform float gridFadeDist${suffix};
    uniform float gridLineThickness${suffix};
    uniform vec2 gridResolution${suffix};
    varying vec2 gridStampUV${suffix};

    ${newShader.fragmentShader}
    `.replace(
        /#include <map_fragment>/,
        v =>
            `${v}
        #if ${defineKeyword}
        {

            // Calculate fade distance
            float fadeFactor = 1.0 - clamp( ( vViewPosition.z - gridFadeStart${suffix} ) * ( 1.0 / gridFadeDist${suffix} ), 0.0, 1.0);

            vec2 r = gridStampUV${suffix} * gridResolution${suffix};
            vec2 grid = abs( fract( r - 0.5 ) - 0.5) / fwidth(r);
            float line = 1.0 - min(min(grid.x, grid.y) - gridLineThickness${suffix}, 1.0);

            float isGridBorder = mix(0.0, saturate(line), fadeFactor);

            // make sure color is visible when on transparent surfaces
            float color = saturate(0.5 - diffuseColor.a);
            diffuseColor = mix(diffuseColor, vec4(color, color, color, gridStampOpacity${suffix}), isGridBorder);
        }
        #endif
        `,
    );

    return newShader;
}

// Topography Representation
// - TopoLine color
// - topoLine thickness
// - topoLine spacing

// TODO: Fade the topo lines based on view-space normal to avoid
// artifacts from overly-skewed angles
function TopoLineShaderMixin(shader: ShaderLibShader) {
    const defineKeyword = 'ENABLE_TOPO_LINES';
    const newShader = cloneShader(
        shader,
        {
            topoLineColor: { value: new Color() },
            topoLineThickness: { value: 0.25 },
            topoLineSpacing: { value: 0.1 },
            topoLineOffset: { value: 0 },
            topoLineEmphasisMod: { value: 10 },
            topoFadeStart: { value: 40 },
            topoFadeDist: { value: 20 },
        },
        {
            [defineKeyword]: 0,
        },
    );

    addWorldPosition(newShader);

    newShader.fragmentShader = `
        uniform vec3 topoLineColor;
        uniform float topoLineThickness;
        uniform float topoLineSpacing;
        uniform float topoLineOffset;
        uniform int topoLineEmphasisMod;
        uniform float topoFadeStart;
        uniform float topoFadeDist;

        ${newShader.fragmentShader}
        `.replace(
        /#include <normal_fragment_maps>/,
        v =>
            /* glsl */`${v}

            #if ${defineKeyword}
            {
                // If a face sits exactly on a topo line then bump the delta so we don't divide by zero
                float yPosDelta = max( fwidth( wPosition.y ), 0.0001 );

                // Calculate the fade distance
                float fadeFactor = 1.0 - clamp( ( vViewPosition.z - topoFadeStart ) * ( 1.0 / topoFadeDist ), 0.0, 1.0 );

                // Calculate if this is an emphasized line or not
                float lineIndex = mod( wPosition.y + topoLineOffset, topoLineSpacing * float( topoLineEmphasisMod ) );
                lineIndex -= topoLineSpacing;
                lineIndex = abs( lineIndex );
                lineIndex = step( lineIndex, topoLineSpacing * 0.5 );

                // Compute the emphasis thickness
                float emphasized = lineIndex == 0.0 ? 0.0 : 1.0;
                float thickness = mix( 0.0, emphasized, fadeFactor );

                // Compute the added thickness for when lines get close together so we don't get moire
                float blend = smoothstep( topoLineSpacing * 0.5, topoLineSpacing, saturate( yPosDelta ) );
                thickness += blend + topoLineThickness;

                float lineFalloff = mod( wPosition.y + topoLineOffset, topoLineSpacing ) / topoLineSpacing;
                lineFalloff = max( lineFalloff, 1.0 - lineFalloff ) * 2.0 - 1.0;

                float topo = smoothstep(
                    1.0,
                    1.0 - yPosDelta * 2.0 / topoLineSpacing,
                    lineFalloff + yPosDelta * thickness / topoLineSpacing
                );
                topo = mix( 1.0, topo, max( fadeFactor, lineIndex )  );

                diffuseColor = mix( diffuseColor, vec4( topoLineColor, 1.0 ), 1.0 - topo );
            }
            #endif
            `,
    );

    return newShader;
}

// Color Ramp
// - Ramp color
// - Ramp min
// - Ramp max
function ColorRampShaderMixin(shader: ShaderLibShader) {
    const defineKeyword = 'ENABLE_COLOR_RAMP';
    const newShader = cloneShader(
        shader,
        {
            rampColor: { value: new Color() },
            rampMin: { value: 0 },
            rampMax: { value: 1 },
        },
        {
            [defineKeyword]: 0,
        },
    );

    addWorldPosition(newShader);

    newShader.fragmentShader = `
    uniform vec3 rampColor;
    uniform float rampMin;
    uniform float rampMax;
    ${newShader.fragmentShader}
    `.replace(
        /vec4 diffuseColor[^;]+;/,
        v =>
            `${v}

            #if ${defineKeyword}
            {
                float rampDelta = rampMax - rampMin;
                float rampPos = wPosition.y - rampMin;
                float rampLerp = clamp(rampPos / rampDelta, 0.0, 1.0);
                diffuseColor = mix(vec4(rampColor, 1.0), diffuseColor, rampLerp);
            }
            #endif
            `,
    );

    return newShader;
}

// Dithered Transparency
function DitheredTransparencyShaderMixin(shader: ShaderLibShader) {

    const defineKeyword = 'ENABLE_DITHER_TRANSPARENCY';
    const newShader = cloneShader(
        shader,
        {
            ditherTex: { value: ditherTex },
        },
        {
            [defineKeyword]: 0,
        },
    );

    // TODO: Use the DataTexture here if possible
    // TODO: don't use opacity, use ditherOpacity instead
    newShader.fragmentShader = `
        uniform sampler2D ditherTex;
        ${newShader.fragmentShader}
    `.replace(
        /main\(\) {/,
        v => `
            ${v}

            #if ${defineKeyword}
            if(texture2D(ditherTex, gl_FragCoord.xy / 4.0).r > opacity) discard;
            #endif
        `,
    );

    return newShader;
}

// discards pixels that aren't higher than some cutoff value
// based on "perturbed" attribute that is between [0, 1] per vertex
function PerturbedFilterShaderMixin(shader: ShaderLibShader) {
    const defineKeyword = 'ENABLE_PERTURB_FILTER';
    const newShader = cloneShader(
        shader,
        {
            cutoff: { value: 0.99 },
        },
        {
            [defineKeyword]: 0,
        },
    );

    newShader.vertexShader = `
        attribute float perturbed;
        varying float vPerturbed;

        ${newShader.vertexShader}
    `.replace(
        /main\s*\(\)\s*{/,
        v =>
            `${v}

            #if ${defineKeyword}
            vPerturbed = perturbed;
            #endif
        `,
    );

    newShader.fragmentShader = `
        varying float vPerturbed;
        uniform float cutoff;

        ${newShader.fragmentShader}
        `.replace(
        /main\s*\(\)\s*{/,
        v =>
            `${v}
            #if ${defineKeyword}
            {
                if(vPerturbed <= cutoff) discard;
            }
            #endif
            `,
    );

    return newShader;
}

function BinnedPointsMixin(shader: ShaderLibShader) {
    const defineKeyword = 'BINNED_POINTS';
    const heightDefineKeyword = 'EXTEND_TO_HEIGHT';
    const newShader = cloneShader(
        shader,
        {
            binnedPointsOffset: { value: new Vector3() },
            binnedPointsScale: { value: 1 },
            bottomHeightZ: { value: 0.0 },
        },
        {
            [defineKeyword]: 0,
            [heightDefineKeyword]: 0,
        },
    );

    newShader.vertexShader = `
        #ifdef ${defineKeyword}
        attribute vec3 instance_position;
		uniform float binnedPointsScale;
		uniform vec3 binnedPointsOffset;
        #endif

        #ifdef ${heightDefineKeyword}
        uniform float bottomHeightZ;
        #endif
        ${newShader.vertexShader}
    `.replace(
        '#include <project_vertex>',
        match => `
        #if ${defineKeyword}
        {
            vec3 offsetPos = instance_position + binnedPointsOffset;
            offsetPos /= binnedPointsScale;
            offsetPos = floor(offsetPos + 0.5);
            offsetPos *= binnedPointsScale;
            offsetPos += vec3(binnedPointsScale) * 0.5;
            offsetPos -= binnedPointsOffset;

            #if ${heightDefineKeyword}
            float bottomHeightSign = sign(bottomHeightZ - instance_position.z);
            bool clampToBottom = bottomHeightSign == sign(transformed.z);
            transformed.z += 0.5 * bottomHeightSign;
            #endif

            transformed *= binnedPointsScale;
            transformed += offsetPos;

            #if ${heightDefineKeyword}
            transformed.z = clampToBottom ? bottomHeightZ : transformed.z;
            #endif
        }
        #endif
        ${match}
    `,
    );

    return newShader;
}

function FenceFromHeightMixin(shader: ShaderLibShader) {
    const defineKeyword = 'ENABLE_FENCE';
    const newShader = cloneShader(
        shader,
        {
            heightmapTextureMap: { value: null },
            worldToHeightmapMatrix: { value: new Matrix4() },
            fenceHeight: { value: 1.0 },
        },
        {
            [defineKeyword]: 1,
        },
    );

    newShader.vertexShader = `
    uniform mat4 worldToHeightmapMatrix;
    varying vec2 fenceUV;

    ${newShader.vertexShader}
    `.replace(
        /#include <worldpos_vertex>/,
        v =>
            `${v}
        #if ${defineKeyword}
        {
            vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
            fenceUV = (worldToHeightmapMatrix * worldPosition).xy + vec2(0.5, 0.5);
        }
        #endif
        `,
    );

    addWorldPosition(newShader);

    newShader.fragmentShader = `
        #ifdef ${defineKeyword}
        uniform sampler2D heightmapTextureMap;
        uniform float fenceHeight;
        varying vec2 fenceUV;
        #endif
        ${newShader.fragmentShader}
    `.replace(
        /#include <map_fragment>/,
        v => `${v}
        #if ${defineKeyword}
        {
            // need to transpose UVs because of how array in heightmapTextureMap was laid out
            float height = texture2D(heightmapTextureMap, fenceUV.yx).r;

            // -height because height represents how much we push "down"
            float dist = abs(wPosition.y - (-height));
            if (dist > fenceHeight) {
                discard;
            }
        }
        #endif
        `,
    );

    return newShader;
}

// Local maximum
// - Height map with mip maps
// - Scale of sampling
// - Maxima threshold
// - Maxima threshold color

export {
    SlopeShaderMixin,
    SteepnessShaderMixin,
    SteepnessClipShaderMixin,
    ColorRampShaderMixin,
    TopoLineShaderMixin,
    DitheredTransparencyShaderMixin,
    ClipPlaneMixin,
    GridClipMixin,
    PerturbedFilterShaderMixin,
    BinnedPointsMixin,
    TextureStampMixin,
    GridStampMixin,
    FenceFromHeightMixin,
    cloneShader,
};
