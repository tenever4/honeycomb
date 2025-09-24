import { BoxGeometry, Material, Vector2, Vector3 } from 'three';
import { ShapeAnnotation } from './ShapeAnnotation';

const delta = new Vector2();
const origin = new Vector2(0, 0);
const temp2 = new Vector2();
const temp3 = new Vector3();

/**
 * Renders a box with a given size.
 * @extends Mesh
 */
export class StadiumAnnotation extends ShapeAnnotation {
    name = 'StadiumAnnotation';
    /**
     * The length of the shape in the Z dimension.
     * @member {Number}
     * @default 1
     */
    get length() {
        return this.scale.z;
    }

    set length(v) {
        this.scale.z = v;
    }

    /**
     * @param {Material} material
     */
    constructor(material?: Material) {
        super(material);
        this.setParameters(
            new Vector2(0, 0),
            new Vector2(0, 1),
            0.5,
        );
    }

    /**
     * Sets the center line and radius of the stadium shape.
     * @param {Vector2} p0
     * @param {Vector2} p1
     * @param {Number} radius
     */
    setParameters(p0: Vector2, p1: Vector2, radius: number) {
        if (this.geometry) this.geometry.dispose();

        delta.subVectors(p1, p0);
        const distance = delta.length();
        const angle = delta.angle();
        const geometry = new BoxGeometry(1, 1, 1, 40, 40, 1);

        const positions = geometry.getAttribute('position') as any;
        for (let i = 0, l = positions.count; i < l; i ++) {
            temp3.fromBufferAttribute(positions, i);

            temp2.x = temp3.x;
            temp2.y = temp3.y;
            temp2.normalize().multiplyScalar(radius);
            if (temp2.x > 0) {
                temp2.x += distance;
            }

            temp2.rotateAround(origin, angle);
            positions.setXYZ(i, temp2.x, temp2.y, temp3.z);
        }

        this.geometry = geometry;
    }
}
