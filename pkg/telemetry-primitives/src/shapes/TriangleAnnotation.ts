import { BufferGeometry, BufferAttribute, Vector2, Vector3, Material } from 'three';
import { ShapeAnnotation } from './ShapeAnnotation';

function createTrianglePositions(v1: Vector2, v2: Vector2, v3: Vector2, target = null) {
    const verts = [v1, v2, v3];
    const indices = new Uint8Array([
        0, 1, 2, // bottom cap

        5, 4, 3, // top cap

        1, 3, 4, // v1 -> v2 quad
        0, 3, 1,

        2, 4, 5, // v2 -> v3 quad
        1, 4, 2,

        0, 5, 3, // v3 -> v1 quad
        2, 5, 0,
    ]);

    // unpack the indices into a positions array so all the triangles are separate
    // and face normals can be calculated.
    const positions = target || new Float32Array(indices.length * 3);
    for (let i = 0, l = indices.length; i < l; i++) {
        const index = indices[i];
        const vert = verts[index % 3];
        positions[i * 3 + 0] = vert.x;
        positions[i * 3 + 1] = vert.y;
        positions[i * 3 + 2] = index >= 3 ? 0.5 : -0.5;
    }

    return positions;
}

function createTriangleGeometry(v1: Vector2, v2: Vector2, v3: Vector2) {
    const geom = new BufferGeometry();
    const position = new BufferAttribute(createTrianglePositions(v1, v2, v3), 3, false);

    geom.setAttribute('position', position);
    geom.computeVertexNormals();
    return geom;
}

/**
 * Class for rendering triangular prisms.
 * @extends Mesh
 */
export class TriangleAnnotation extends ShapeAnnotation {
    name = 'TriangleAnnotation';
    /**
     * The length of the triagular prism on the Z axis.
     * @member {Number}
     * @default 1
     */
    get length() {
        return this.scale.z;
    }

    set length(v) {
        this.scale.z = v;
    }

    _p1: Vector2;
    _p2: Vector2;
    _p3: Vector2;

    constructor(p1: Vector2, p2: Vector2, p3: Vector2, material?: Material);
    constructor(p1: Vector3, p2: Vector3, p3: Vector3, material?: Material);
    constructor(material?: Material);

    constructor(...args: [
        p1: Vector2, p2: Vector2, p3: Vector2,
        /**
         * An instance of material derived from the {@link THREE.MaterialMaterial} base class or an array of materials, defining the object's appearance.
         */
        material?: Material
    ] | [
        p1: Vector3, p2: Vector3, p3: Vector3,
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

        const _p1 = new Vector2(-1, 0);
        const _p2 = new Vector2(0, 1);
        const _p3 = new Vector2(1, 0);

        let material;

        // backwards compatible
        if (args[0] instanceof Vector2 || args[0] instanceof Vector3) {
            if (args[0]) _p1.copy(args[0] as Vector2);
            if (args[1]) _p2.copy(args[1] as Vector2);
            if (args[2]) _p3.copy(args[2] as Vector2);
            material = args[3];
        } else {
            material = args[0];
        }

        this.material = material || this.material;

        this.geometry = createTriangleGeometry(_p1, _p2, _p3);
        this._p1 = _p1;
        this._p2 = _p2;
        this._p3 = _p3;
    }

    /**
     * Sets the X and Y positions of triangl vertices.
     * @param {Vector2|Vector3} p1
     * @param {Vector2|Vector3} p2
     * @param {Vector2|Vector3} p3
     */
    setVertices(p1: Vector2 | Vector3, p2: Vector2 | Vector3, p3: Vector2 | Vector3) {
        const { _p1, _p2, _p3, geometry } = this;
        _p1.copy(p1 as Vector2);
        _p2.copy(p2 as Vector2);
        _p3.copy(p3 as Vector2);

        (geometry.attributes.position as any).array = createTrianglePositions(
            _p1,
            _p2,
            _p3,
            (geometry.attributes.position as any).array,
        );
        geometry.computeVertexNormals();
        geometry.attributes.position.needsUpdate = true;
    }

    /**
     * Sets p1, p2, and p3 to the X and Y position of the triangle vertices.
     * Z is set to 0 if Vector3s are passed in.
     * @param {Vector2|Vector3} p1
     * @param {Vector2|Vector3} p2
     * @param {Vector2|Vector3} p3
     */
    getVertices(p1: Vector2 | Vector3, p2: Vector2 | Vector3, p3: Vector2 | Vector3) {
        const { _p1, _p2, _p3 } = this;

        p1.set(_p1.x, _p1.y, 0);
        p2.set(_p2.x, _p2.y, 0);
        p3.set(_p3.x, _p3.y, 0);
    }

    copy(source: this) {
        super.copy(source);
        this.setVertices(source._p1, source._p2, source._p3);
        return this;
    }
}
