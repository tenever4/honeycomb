import { CylinderGeometry, Material } from 'three';
import { InstancedShapeAnnotation } from './ShapeAnnotation';

// rotate it so Z is the long axis
const cylinderGeometry = new CylinderGeometry(1, 1, 1, 40);
cylinderGeometry.rotateX(Math.PI / 2);

/**
 * Renders an elliptical cylinder.
 * @extends InstancedMesh
 */
export class InstancedEllipticCylinderAnnotation extends InstancedShapeAnnotation {
    name = 'InstancedEllipticCylinderAnnotation';

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

    constructor(radius: number, length: number, material?: Material, count?: number);
    constructor(material?: Material, count?: number);

    constructor(...args: [
        radius: number, length: number,
        /**
         * An instance of material derived from the {@link THREE.MaterialMaterial} base class or an array of materials, defining the object's appearance.
         */
        material?: Material,
        /**
         * The number of instances.
         */
        count?: number
    ] | [
        /**
         * An instance of material derived from the {@link THREE.MaterialMaterial} base class or an array of materials, defining the object's appearance.
         */
        material?: Material,
        /**
         * The number of instances.
         */
        count?: number
    ]) {
        let material;
        let count;
        let radiusX, radiusY;
        let length;
        if (typeof args[0] === 'number') {
            if (args[0]) radiusX = radiusY = args[0];
            if (args[1]) length = args[1];
            material = args[2];
            count = args[3];
        } else {
            material = args[0];
            count = args[1];
        }
        super(material, count);

        if (radiusX) this.radiusX = radiusX;
        if (radiusY) this.radiusY = radiusY;
        if (length) this.length = length;

        this.geometry = cylinderGeometry;

        this.material = material ?? this.material;
        this.count = count ?? 1;
    }
}

/**
 * Version of InstancedEllipticCylinderAnnotation that has a setter for the full cylinder radius.
 * @extends InstancedEllipticCylinderAnnotation
 */
export class InstancedCylinderAnnotation extends InstancedEllipticCylinderAnnotation {
    name = 'InstancedCylinderAnnotation';
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
