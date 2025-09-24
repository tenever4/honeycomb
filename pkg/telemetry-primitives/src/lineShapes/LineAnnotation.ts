import { Vector2, EdgesGeometry, BufferGeometry } from 'three';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { AnnotationMixin } from '../base/Annotation';


/**
 * Creates a thick line.
 * @extends Line2
 */
export class LineAnnotation extends AnnotationMixin(Line2) {
    /**
     * Sets the color of the line.
     * @member {Color}
     * @default 0xffffff
     */
    get color() {
        return this.material.color;
    }

    /**
     * Sets the width of the line.
     * @member {Number}
     * @default 1
     */
    get lineWidth() {
        return this.material.uniforms.linewidth.value;
    }

    set lineWidth(v) {
        this.material.uniforms.linewidth.value = v;
    }

    /**
     * @param {LineMaterial} material
     */
    constructor(material?: LineMaterial) {
        if (!material) {
            material = new LineMaterial({
                color: 0xffffff,
                linewidth: 1,
                resolution: new Vector2(1000, 1000),
                dashed: false,
            });
        }

        super(undefined, material);
        this.setPositions([
            0, 0, 0,
            0, 0, 1,
        ]);
        this.name = 'LineAnnotation';
    }

    _rawPosArr?: number[] | Float32Array;

    /**
     * Sets the geometry of the line to the passed array of vertices. The array should be
     * a list of numbers with every 3 tuple representing a point in space.
     * @param {Array|TypedArray} arr
     */
    setPositions(arr: number[] | Float32Array) {
        const geometry = new LineGeometry();
        geometry.setPositions(arr);

        this.geometry.dispose();
        this.geometry = geometry;

        this._rawPosArr = arr;
    }

    /**
     * Sets the line based on the edges of the given geometry. The threshold is angle between the faces over
     * which a line will be added in degrees.
     * @param {BufferGeometry} newGeometry
     * @param {Number} [threshold=45]
     */
    setFromGeometry(newGeometry: BufferGeometry, threshold: number = 45) {
        this.geometry.dispose();
        this.geometry = new LineSegmentsGeometry().fromEdgesGeometry(
            new EdgesGeometry(newGeometry, threshold),
        ) as LineGeometry;
    }

    copy(source: this) {
        super.copy(source);

        // mrdoob/three.js#21781
        // mrdoob/three.js#21782
        this.geometry.dispose();
        // this.geometry = source.geometry.clone();
        this.geometry = source.geometry;
        this.material = source.material;

        return this;
    }
}
