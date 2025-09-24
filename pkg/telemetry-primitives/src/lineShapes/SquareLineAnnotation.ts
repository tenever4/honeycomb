import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineAnnotation } from './LineAnnotation';

/**
 * Renders a square line on X and Y.
 * @extends LineAnnotation
 */
export class SquareLineAnnotation extends LineAnnotation {
    /**
     * @param {LineMaterial} material
     */
    constructor(material?: LineMaterial) {
        super(material);
        this.setPositions([
            -0.5, -0.5, 0,
            -0.5, 0.5, 0,
            0.5, 0.5, 0,
            0.5, -0.5, 0,
            -0.5, -0.5, 0,
        ]);
    }

    /**
     * Sets the width and height of the square on X and Y.
     * @param {Number} width
     * @param {Number} height
     */
    setSize(width: number, height: number) {
        this.scale.set(width, height, 1);
    }
}
