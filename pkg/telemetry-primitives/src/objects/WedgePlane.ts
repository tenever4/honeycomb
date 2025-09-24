import { Mesh, PlaneGeometry, Color, ShaderMaterial, DoubleSide, Material } from 'three';

const wedgePlaneShader = {
    side: DoubleSide,
    transparent: true,

    uniforms: {
        color: { value: new Color(0xffffff) },
        opacity: { value: 0.5 },
        fadeStart: { value: 0.99 },
        fadePower: { value: 2.0 },
        angle: { value: 0 },
    },

    vertexShader: /* glsl */ `
        varying vec3 _localPos;
		void main() {

			#include <begin_vertex>
			#include <project_vertex>

            _localPos = position;

		}
    `,

    fragmentShader: /* glsl */ `
        varying vec3 _localPos;
        uniform vec3 color;
        uniform float opacity;
        uniform float fadeStart;
        uniform float fadePower;
        uniform float angle;

        void main() {

            float dist = length( _localPos );
            float delta = 1.0 - fadeStart;
            float toEdge = ( dist - fadeStart ) / delta;
            float val = pow( 1.0 - clamp( toEdge , 0.0, 1.0 ), fadePower );

            if ( val > 1.0 ) discard;

            float pixelAngle = atan( _localPos.y, _localPos.x );

            float minAngle = min( angle, 0.0 );
            float maxAngle = max( angle, 0.0 );
            if ( pixelAngle < minAngle || pixelAngle > maxAngle ) {

                discard;

            }

            gl_FragColor = vec4( color, val * opacity );

        }
    `,
};
const wedgePlaneMaterial = new ShaderMaterial(wedgePlaneShader);

/**
 * Class for rendering a wedge on plane using a shader. Angle starts at the X axis.
 * @extends Mesh
 */
export class WedgePlane extends Mesh {
    /**
     * The angle of the wedge in radians.
     * @member {Number}
     * @default 0
     */
    get angle() {
        return (this.material as any).uniforms.angle.value;
    }

    set angle(angle) {
        // ensure the angle is positive
        angle = angle % (2 * Math.PI);
        if (angle < 0) {
            angle += 2 * Math.PI;
        }
        if (angle > Math.PI) {
            angle -= 2 * Math.PI;
        }

        (this.material as any).uniforms.angle.value = angle;
    }

    /**
     * The opacity of the wedge.
     * @member {Number}
     * @default 1
     */
    get opacity() {
        return (this.material as any).uniforms.opacity.value;
    }

    set opacity(v) {
        (this.material as any).uniforms.opacity.value = v;
    }

    /**
     * The Color of the wedge.
     * @member {Color}
     * @default 0xffffff
     */
    get color() {
        return (this.material as any).uniforms.color.value;
    }

    /**
     * The radius of the wedge.
     * @member {Number}
     * @default 1
     */
    get radius() {
        return this.scale.x;
    }

    set radius(v) {
        this.scale.setScalar(v);
    }

    constructor() {
        super(new PlaneGeometry(2, 2), wedgePlaneMaterial.clone());
        this.name = 'Wedge Plane';
    }

    copy(source: this) {
        const { material, geometry } = this;
        super.copy(source);
        this.material = material;
        this.geometry = geometry;

        (this.material as Material).copy(source.material as Material);
        return this;
    }
}
