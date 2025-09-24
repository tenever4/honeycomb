import { CircleArc } from '@gov.nasa.jpl.honeycomb/three-extensions';
import { LineAnnotation } from './LineAnnotation';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

/**
 * Class for rendering an ellipse with a Line.
 * @extends LineAnnotation
 */
export class EllipseLineAnnotation extends LineAnnotation {
    /**
     * Sets the radius of the ellipse on the X axis.
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
     * Sets the radius of the ellipse on the Y axis.
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
     * @param {LineMaterial} material
     */
    constructor(material?: LineMaterial) {
        super(material);

        const arr: number[] = [];
        const arc = new CircleArc();
        arc.deltaHeading = 2 * Math.PI;
        arc.forEachPoint(360, (origin, tangent) => {
            arr.push(tangent.x, tangent.y, 0);
        });
        this.setPositions(arr);
    }
}

/**
 * Class for rendering a cricle with a Line.
 * @extends EllipseLineAnnotation
 */
export class CircleLineAnnotation extends EllipseLineAnnotation {
    /**
     * Sets the X and Y radius to the same value. Returns the x radius if they
     * were set separately.
     * @member {Number}
     */
    get radius() {
        return this.radiusX;
    }

    set radius(v) {
        this.radiusX = this.radiusY = v;
    }
}
