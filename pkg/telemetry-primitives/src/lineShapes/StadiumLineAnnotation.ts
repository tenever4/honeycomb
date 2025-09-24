import { CircleArc } from '@gov.nasa.jpl.honeycomb/three-extensions';
import { Vector2 } from 'three';
import { LineAnnotation } from './LineAnnotation';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

const delta = new Vector2();
const origin = new Vector2(0, 0);
const temp = new Vector2();

/**
 * Renders a stadium shape.
 * @extends LineAnnotation
 */
export class StadiumLineAnnotation extends LineAnnotation {
    /**
     * @param {LineMaterial} material
     */
    constructor(material: LineMaterial) {
        super(material);
        this.setParameters(
            new Vector2(0, 0),
            new Vector2(0, 1),
            0.5,
        );
    }

    /**
     * Sets the center line and radius of the stadium shape.
     * @param {Vector2} p0
     * @param {Vector2} p1
     * @param {Number} radius
     */
    setParameters(p0: Vector2, p1: Vector2, radius: number) {
        delta.subVectors(p1, p0);
        const angle = delta.angle();

        const arr: number[] = [];
        const arc = new CircleArc();
        arc.deltaHeading = Math.PI;
        arc.startHeading = Math.PI / 2;
        arc.forEachPoint(180, (point, tangent) => {
            temp
                .set(tangent.x, tangent.y)
                .rotateAround(origin, angle)
                .normalize()
                .multiplyScalar(radius)
                .add(p0);
            arr.push(temp.x, temp.y, 0);
        });

        arc.startHeading = 3 * Math.PI / 2;
        arc.forEachPoint(180, (point, tangent) => {
            temp
                .set(tangent.x, tangent.y)
                .rotateAround(origin, angle)
                .normalize()
                .multiplyScalar(radius)
                .add(p1);
            arr.push(temp.x, temp.y, 0);
        });

        arr.push(arr[0], arr[1], arr[2]);

        this.setPositions(arr);
    }
}
