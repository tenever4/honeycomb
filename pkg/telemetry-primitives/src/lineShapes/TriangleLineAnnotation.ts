import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineAnnotation } from './LineAnnotation';
import { Vector2, Vector3 } from 'three';

/**
 * Class for rendering a triangular line.
 * @extends {LineAnnotation}
 */
export class TriangleLineAnnotation extends LineAnnotation {
    _p1: Vector2;
    _p2: Vector2;
    _p3: Vector2;

    /**
     * @param {LineMaterial} material
     */
    constructor(material?: LineMaterial) {
        super(material);

        this._p1 = new Vector2(-1, 0);
        this._p2 = new Vector2(0, 1);
        this._p3 = new Vector2(1, 0);

        this.setVertices(this._p1, this._p2, this._p3);
    }

    /**
     * Sets the positions of the vertices on X and Y.
     * @param {Vector2|Vector3} v1
     * @param {Vector2|Vector3} v2
     * @param {Vector2|Vector3} v3
     */
    setVertices(v1: Vector2 | Vector3, v2: Vector2 | Vector3, v3: Vector2 | Vector3) {
        const arr = [
            v1.x, v1.y, 0,
            v2.x, v2.y, 0,
            v3.x, v3.y, 0,
            v1.x, v1.y, 0,
        ];
        super.setPositions(arr);

        this._p1.copy(v1 as Vector2);
        this._p2.copy(v2 as Vector2);
        this._p3.copy(v3 as Vector2);
    }

    /**
     * Gets the positions of the vertices on X and Y. If Vector3s are passed in
     * Z is set to 0.
     * @param {Vector2|Vector3} v1
     * @param {Vector2|Vector3} v2
     * @param {Vector2|Vector3} v3
     */
    getVertices(v1: Vector2 | Vector3, v2: Vector2 | Vector3, v3: Vector2 | Vector3) {
        const { _p1, _p2, _p3 } = this;
        v1.set(_p1.x, _p1.y, 0);
        v2.set(_p2.x, _p2.y, 0);
        v3.set(_p3.x, _p3.y, 0);
    }
}
