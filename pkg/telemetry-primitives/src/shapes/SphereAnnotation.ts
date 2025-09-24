import { SphereGeometry, Material } from 'three';
import { ShapeAnnotation } from './ShapeAnnotation';

const sphereGeometry = new SphereGeometry(1, 32, 32);

/**
 * Class for rendering a sphere with asymmetrical radii on X, Y, and Z.
 * @extends Mesh
 */
export class SpheroidAnnotation extends ShapeAnnotation {
    /**
     * The dimensions of the radius on each X, Y, and Z dimenions of the spheroid.
     * @member {Vector3}
     */
    get dimensions() {
        return this.scale;
    }

    /**
     * The center position of the spheroid.
     * @member {Vector3}
     */
    get center() {
        return this.position;
    }

    /**
     * @param {Material} material
     */
    constructor(radius?: number, material?: Material) {
        super(material);
        this.name = 'SpheroidAnnotation';

        if (radius !== undefined) {
            this.scale.set(radius, radius, radius);
        }

        this.geometry = sphereGeometry;
    }
}

/**
 * Version of SpheroidAnnotation that has a setter for the full sphere radius.
 * @extends SpheroidAnnotation
 */
export class SphereAnnotation extends SpheroidAnnotation {
    
    name = 'SphereAnnotation';

    /**
     * Sets the radius for the full sphere. Returns the radius for X if the radius dimensions have been
     * been set separately.
     * @member {Number}
     * @default 1
     */
    get radius() {
        return this.scale.x;
    }

    set radius(v) {
        this.scale.setScalar(v);
    }
}
