import { Vector4 } from 'three';

export const ScreenPlaneShader = {
    uniforms: {
        tex: { value: null },
        screenPosition: { value: new Vector4() },
    },
    vertexShader: /* glsl */ `
        uniform vec4 screenPosition;
        varying vec2 vUv;
        void main() {
            vUv = uv;

            vec2 min = screenPosition.xy;
            vec2 dim = screenPosition.zw;
            gl_Position = vec4(
                2.0 * ( min + uv.xy * dim ) - vec2( 1.0 ),
                0.0, 1.0
            );
        }
    `,
    fragmentShader: /* glsl */ `
        uniform sampler2D tex;
        varying vec2 vUv;
        void main() {
            gl_FragColor = texture2D( tex, vUv );
            #include <encodings_fragment>
        }
    `,
};
