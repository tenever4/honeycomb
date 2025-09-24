import { BufferGeometry, BufferAttribute, Vector2, Material, Vector3 } from 'three';
import { ShapeAnnotation } from './ShapeAnnotation';

function createHexagonIndices() {
    return new Uint8Array([
        // top cap
        0, 2, 1,
        0, 3, 2,
        0, 4, 3,
        0, 5, 4,

        // bottom cap
        6, 7, 8,
        6, 8, 9,
        6, 9, 10,
        6, 10, 11,

        // face 1
        0, 1, 7,
        0, 7, 6,

        // face 2
        1, 2, 8,
        1, 8, 7,

        // face 3
        2, 3, 9,
        2, 9, 8,

        // face 4
        3, 4, 10,
        3, 10, 9,

        // face 5
        4, 5, 11,
        4, 11, 10,

        // face 6
        5, 0, 6,
        5, 6, 11,
    ]);
}

function createHexagonPositions(verts: Vector2[], target = null) {
    const pos = target || new Float32Array(36);
    let count = 0;
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 6; j++) {
            const currVert = verts[j];
            pos[count] = currVert.x;
            pos[count + 1] = currVert.y;
            pos[count + 2] = i === 0 ? 0.5 : -0.5;
            count += 3;
        }
    }

    return pos;
}

function createHexagonGeometry(verts: Vector2[]) {
    const geom = new BufferGeometry();
    const position = new BufferAttribute(createHexagonPositions(verts), 3, false);
    const indices = new BufferAttribute(createHexagonIndices(), 1, false);

    geom.setAttribute('position', position);
    geom.index = indices;
    geom.computeVertexNormals();
    return geom;
}

/**
 * Class for creating and rendering a hexagonal prism.
 * @extends Mesh
 */
export class HexagonAnnotation extends ShapeAnnotation {
    private readonly _vertices: Vector2[];
    name = 'HexagonAnnotation';

    /**
     * Sets the length of the prism along the Z axis.
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

        this._vertices = [
            new Vector2(-0.5, 0.5),
            new Vector2(0, 1),
            new Vector2(0.5, 0.5),
            new Vector2(0.5, -0.5),
            new Vector2(0, -1),
            new Vector2(-0.5, -0.5),
        ];

        this.geometry = createHexagonGeometry(this._vertices);
    }

    /**
     * Set the position of the hexagon vertices on X and Y.
     * @param  {...Vector2|Vector3} points
     */
    setVertices(...points: (Vector2 | Vector3)[]) {
        const { _vertices, geometry } = this;
        for (let i = 0, l = _vertices.length; i < l; i++) {
            _vertices[i].copy(new Vector2(points[i].x, points[i].y));
        }

        (geometry.attributes.position as any).array = createHexagonPositions(
            _vertices,
            (geometry.attributes.position as any).array,
        );
        geometry.computeVertexNormals();
        geometry.attributes.position.needsUpdate = true;
    }

    /**
     * Get the position of the hexagon vertices on X and Y. If Vector3s are passed in
     * Z is set to 0.
     * @param  {...Vector2|Vector3} points
     */
    getVertices(...points: (Vector2 | Vector3)[]) {
        const { _vertices } = this;
        for (let i = 0, l = _vertices.length; i < l; i++) {
            const v = _vertices[i];
            points[i].set(v.x, v.y, 0);
        }
    }

    copy(source: this) {
        super.copy(source);
        this.setVertices(...source._vertices);
        return this;
    }
}
