import { CylinderGeometry, Material } from 'three';
import { ShapeAnnotation } from './ShapeAnnotation';

// rotate it so Z is the long axis
const cylinderGeometry = new CylinderGeometry(1, 1, 1, 40);
cylinderGeometry.rotateX(Math.PI / 2);

/**
 * Renders an elliptical cylinder.
 * @extends Mesh
 */
export class EllipticCylinderAnnotation extends ShapeAnnotation {
    name = 'EllipticCylinderAnnotation';

    /**
     * The radius of the cylinder in the X dimension.
     * @member {Number}
     * @default 1
     */
    get radiusX() {
        return this.scale.x;
    }

    set radiusX(v) {
        this.scale.x = v;
    }

    /**
     * The radius of the cylinder in the Y dimension.
     * @member {Number}
     * @default 1
     */
    get radiusY() {
        return this.scale.y;
    }

    set radiusY(v) {
        this.scale.y = v;
    }

    /**
     * The length of the cylinder in the Z dimension.
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
     * The center of the cylinder.
     * @member {Vector3}
     */
    get center() {
        return this.position;
    }


    constructor(material?: Material);
    constructor(radius?: number, length?: number, material?: Material);

    constructor(...args: [
        material?: Material
    ] | [
        radius?: number, length?: number,
        material?: Material
    ]) {
        super();
        this.geometry = cylinderGeometry;

        let material: Material | undefined;
        if (typeof args[0] === 'number') {
            if (args[0]) this.radiusX = this.radiusY = args[0];
            if (args[1]) this.length = args[1];
            material = args[2];
        } else {
            material = args[0];
        }

        this.material = material ?? this.material;
    }
}

/**
 * Version of EllipticCylinderAnnotation that has a setter for the full cylinder radius.
 * @extends EllipticCylinderAnnotation
 */
export class CylinderAnnotation extends EllipticCylinderAnnotation {
    name = 'CylinderAnnotation';
    /**
     * Sets the radius in X and Y of the cylinder.
     * @member {Number}
     * @default 1
     */
    get radius() {
        return this.radiusX;
    }

    set radius(v) {
        this.radiusX = this.radiusY = v;
    }
}
