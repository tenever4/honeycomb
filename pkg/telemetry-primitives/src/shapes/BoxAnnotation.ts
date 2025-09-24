import { BoxGeometry, Material } from 'three';
import { ShapeAnnotation } from './ShapeAnnotation';

const boxGeometry = new BoxGeometry();

/**
 * Renders a box with a given size.
 * @extends Mesh
 */
export class BoxAnnotation extends ShapeAnnotation {
    name = 'BoxAnnotation';
    geometry: BoxGeometry;

    /**
     * The size of the box in X, Y, and Z
     * @member {Vector3}
     */
    get size() {
        return this.scale;
    }

    /**
     * The center position of the box.
     * @member {Vector3}
     */
    get center() {
        return this.position;
    }

    constructor(sizeX: number, sizeY: number, sizeZ: number, material?: Material);
    constructor(material?: Material);

    constructor(...args: [
        sizeX: number, sizeY: number, sizeZ: number,
        /**
         * An instance of material derived from the {@link THREE.MaterialMaterial} base class or an array of materials, defining the object's appearance.
         */
        material?: Material
    ] | [
        /**
         * An instance of material derived from the {@link THREE.MaterialMaterial} base class or an array of materials, defining the object's appearance.
         */
        material?: Material
    ]) {
        super();
        this.geometry = boxGeometry;

        let material;
        if (typeof args[0] === 'number') {
            if (args[0]) this.size.x = args[0];
            if (args[1]) this.size.y = args[1];
            if (args[2]) this.size.z = args[2];
            material = args[3];
        } else {
            material = args[0];
        }

        this.material = material ?? this.material;
    }
}
