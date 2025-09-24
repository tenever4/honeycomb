import { Vector2, Vector3, MathUtils, Line3 } from 'three';

// This uses a custom EPSILON as Number.EPSILON failed to cover some floating point
// errors that were introduced from practical calculations
const EPSILON = 1e-10;

const targetVec2 = new Vector2();

const originVec = new Vector2(0, 0);
const centerMidpoint = new Vector2();
const centerDirection = new Vector2();

const pointToPointCenter = new Vector2();
const startLine = new Vector2();
const endLine = new Vector2();
const deltaLine = new Vector2();

const atCenter = new Vector2();
const forEachVector = new Vector2();
const forEachTangent = new Vector2();

const vec31 = new Vector3();
const vec32 = new Vector3();
const vec33 = new Vector3();

const line = new Line3();
const closestVec = new Vector3();
const closestVec2 = new Vector3();

function v3to2(v: Vector3): Vector2 {
    return new Vector2(v.x, v.y);
}

function v2to3(v: Vector2, z: number = 0): Vector3 {
    return new Vector3(v.x, v.y, z);
}

function signedAngle(startLine: Vector3, endLine: Vector3) {
    vec31.copy(startLine);
    vec31.z = 0;

    vec32.copy(endLine);
    vec32.z = 0;

    vec33.crossVectors(vec31, vec32);

    const angleSign = Math.sign(vec33.z);
    const angleAbs = vec31.angleTo(vec32);
    return angleSign * angleAbs;
}

function toPositiveAngle(angle: number) {
    // Remove any angle offsets if its greather than one full rotation
    angle = angle % (2 * Math.PI);

    // Make sure it's the positive representation of that angle
    if (angle < 0) {
        angle += 2 * Math.PI;
    }

    return angle;
}

function angleWithinWedge(minAngle: number, maxAngle: number, angle: number) {
    const deltaAngle = maxAngle - minAngle;
    angle = toPositiveAngle(angle);
    minAngle = toPositiveAngle(minAngle);
    maxAngle = minAngle + deltaAngle;

    return angle > minAngle && angle < maxAngle;
}

type ForEachPointCallback = (point: Vector2, tangent: Vector2, index: number) => void;

/**
 * Mathematical description of an arc on the edge of a circle.
 */
export class CircleArc {
    /**
     * The start point along the arc.
     * @member {Vector2}
     * @default (0,0)
     */
    startPoint = new Vector2();

    /**
     * The end point along the arc.
     * @member {Vector2}
     * @default (0,0)
     */
    endPoint = new Vector2();

    /**
     * The change in heading along the arc.
     * @member {Number}
     * @default 0
     */
    deltaHeading: number = 0;

    /**
     * The initial heading of the arc. This is only used for cases where the initial
     * heading cannot be inferred, such as when the arc length are 0.
     * @member {Number}
     * @default 0
     */
    startHeading: number = 0;

    constructor() { }

    /**
     * Converts this arc to the shortest variant to get to the same point. If the arc
     * sweeps larger than PI / 2 then we invert the delta heading.
     *
     * @returns {void}
     */
    toShortestArc(): void {
        if (Math.abs(this.deltaHeading) > Math.PI) {
            this.deltaHeading = this.deltaHeading - Math.sign(this.deltaHeading) * 2 * Math.PI;
        }
    }

    /**
     * Gets the center of the circle that this arc is on.
     *
     * @param {Vector2} target
     * @returns {Vector2}
     */
    getCircleCenter(target: Vector2): Vector2 {
        const { startPoint, endPoint, deltaHeading } = this;

        const radius = this.getCircleRadius();

        if (radius === 0 || radius === Infinity) {
            throw new Error();
        }

        // chord midpoint
        centerMidpoint.lerpVectors(startPoint, endPoint, 0.5);

        // center direction
        centerDirection
            .subVectors(endPoint, startPoint)
            .normalize()
            .rotateAround(originVec, (Math.sign(deltaHeading) * Math.PI) / 2);

        const dist = radius * Math.cos(deltaHeading / 2);

        targetVec2.copy(centerMidpoint).addScaledVector(centerDirection, dist);

        target.copy(targetVec2);
        return target;
    }

    /**
     * Gets the radius of the circle that this arc is on.
     *
     * @returns {Number}
     */
    getCircleRadius(): number {
        const { deltaHeading } = this;
        const bottomLen = this.getChordLength();
        const radius = bottomLen / 2 / Math.sin(deltaHeading / 2);

        return Math.abs(radius);
    }

    /**
     * Get the chord length from the start point to the end point of the arc.
     *
     * @returns {Number}
     */
    getChordLength(): number {
        return this.startPoint.distanceTo(this.endPoint);
    }

    /**
     * Get the length of the arc.
     *
     * @returns {Number}
     */
    getArcLength(): number {
        const deltaHeading = this.deltaHeading;
        const chordLength = this.getChordLength();

        let arcLength;
        if (deltaHeading === 0) {
            arcLength = chordLength;
        } else {
            arcLength = (deltaHeading * chordLength) / (2 * Math.sin(deltaHeading / 2));
        }
        return arcLength;
    }

    /**
     * Sets target to the point on the arc that is closest to the given point.
     * Returns the target vector.
     *
     * @param {Vector2} point
     * @param {Vector2} target
     * @returns {Vector2}
     */
    // TODO: Validate this
    closestPointToPoint(point: Vector2, target: Vector2): Vector2 {
        const { startPoint, endPoint, deltaHeading } = this;

        if (Math.abs(deltaHeading) < EPSILON) {
            line.start.copy(v2to3(startPoint));
            line.end.copy(v2to3(endPoint));
            closestVec.copy(v2to3(point));

            line.closestPointToPoint(closestVec, true, closestVec2);
            target.copy(v3to2(closestVec2));
            return target;
        }

        const radius = this.getCircleRadius();
        this.getCircleCenter(pointToPointCenter);

        startLine.subVectors(startPoint, pointToPointCenter);
        endLine.subVectors(endPoint, pointToPointCenter);
        deltaLine.subVectors(point, pointToPointCenter);

        // TODO: remove use of signedAngle here
        const angle = signedAngle(v2to3(startLine), v2to3(deltaLine));
        let minAngle = 0;
        let maxAngle = deltaHeading;
        if (minAngle > maxAngle) {
            const temp = minAngle;
            minAngle = maxAngle;
            maxAngle = temp;
        }

        // If the point is within the arc "wedge" then the closest point
        // must be on the arc. Otherwise it will be one of the endpoints
        if (angleWithinWedge(minAngle, maxAngle, angle)) {
            targetVec2
                .copy(deltaLine)
                .normalize()
                .multiplyScalar(radius)
                .add(pointToPointCenter);
        } else {
            const startDist = startPoint.distanceToSquared(point);
            const endDist = endPoint.distanceToSquared(point);
            if (startDist < endDist) {
                targetVec2.copy(startPoint);
            } else {
                targetVec2.copy(endPoint);
            }
        }

        target.copy(targetVec2);
        return target;
    }

    /**
     * Sets the target vector to the point `t` along the arc where `t` is between 0 and 1.
     * Returns the target vector.
     *
     * @param {Number} t
     * @param {Vector2} target
     * @returns {Vector2}
     */
    at(t: number, target: Vector2): Vector2 {
        const { startPoint, deltaHeading } = this;

        this.getCircleCenter(atCenter);

        const angle = MathUtils.lerp(0, deltaHeading, t);
        targetVec2.copy(startPoint).rotateAround(atCenter, angle);

        target.copy(targetVec2);
        return target;
    }

    /**
     * Fires the callback for every `steps + 1` points along the arc. Callback takes
     * the point, the tangent, and the step index.
     * @param {Number} steps
     * @param {ForEachPointCallback} cb
     * @returns {void}
     */
    forEachPoint(steps: number, cb: ForEachPointCallback): void {
        const { startPoint, endPoint, deltaHeading, startHeading } = this;

        // If the arc represents a straight line
        if (Math.abs(deltaHeading) < EPSILON) {
            // If the arc goes nowhere
            if (startPoint.distanceTo(endPoint) < EPSILON) {
                forEachTangent.set(1, 0).rotateAround(originVec, startHeading);
            } else {
                forEachTangent.subVectors(endPoint, startPoint).normalize();
            }

            for (let i = 0; i <= steps; i++) {
                forEachVector.lerpVectors(startPoint, endPoint, i / steps);
                cb(forEachVector, forEachTangent, i);
            }
        } else if (startPoint.distanceTo(endPoint) < EPSILON) {
            // If the arc turns in place
            forEachVector.copy(startPoint);
            for (let i = 0; i <= steps; i++) {
                const angle = startHeading + MathUtils.lerp(0, deltaHeading, i / steps);
                forEachTangent.set(1, 0).rotateAround(originVec, angle);
                cb(forEachVector, forEachTangent, i);
            }
        } else {
            // Rotate the start point around the center until the end point is
            // reached. We prefer this method to generating arcs because otherwise
            // iteratively increasing the heading and stepping will lead to accuracy errors.
            this.getCircleCenter(atCenter);

            for (let i = 0; i <= steps; i++) {
                const angle = MathUtils.lerp(0, deltaHeading, i / steps);
                forEachVector.copy(startPoint).rotateAround(atCenter, angle);

                forEachTangent
                    .subVectors(forEachVector, atCenter)
                    .rotateAround(originVec, Math.PI / 2)
                    .normalize()
                    .multiplyScalar(Math.sign(deltaHeading));

                cb(forEachVector, forEachTangent, i);
            }
        }
    }

    /**
     * Generate an array of x, y, z points along the the arc with z at 0.
     * @param {Number} steps
     * @param {Array} target
     * @returns {Array}
     */
    generatePoints(steps: number, target: Array<any>): Array<any> {
        target.length = (steps + 1) * 3;
        this.forEachPoint(steps, (point, tangent, i) => {
            target[i * 3 + 0] = point.x;
            target[i * 3 + 1] = point.y;
            target[i * 3 + 2] = 0;
        });
        return target;
    }

    /**
     * Sets this CircleArc to have the same properties as `source`.
     * @param {CircleArc} source
     * @returns {void}
     */
    copy(source: CircleArc): void {
        this.deltaHeading = source.deltaHeading;
        this.startHeading = source.startHeading;
        this.startPoint.copy(source.startPoint);
        this.endPoint.copy(source.endPoint);
    }

    /**
     * Creates a clone of this object.
     * @returns {CircleArc}
     */
    clone(): CircleArc {
        const clone = new CircleArc();
        clone.copy(this);
        return clone;
    }
}
