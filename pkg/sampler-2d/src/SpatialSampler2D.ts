import { TypedArray } from '@gov.nasa.jpl.honeycomb/common';
import { Sampler2D } from './Sampler2D';

/**
 * A sampler that contains members and functions for sampling with a 2D transform
 * into the samplers texture space.
 */
export class SpatialSampler2D extends Sampler2D {
    inverseMatrix: number[];

    constructor(
        data: TypedArray,
        width: number,
        stride: number
    ) {
        super(data, width, stride);

        /**
         * A 3x3 matrix that transforms from the given coordinate frame into the local
         * [ 0, 1 ] texture space of the sampler for use in the spatial sample functions.
         * @member {Array<Number>}
         * @default identity matrix
         */
        this.inverseMatrix = [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1,
        ];
    }

    /**
     * Transforms X and Y by {@link #SpatialSampler2D#inverseMatrix inverseMatrix} before
     * sampling the texture using {@link Sampler2D.sampleChannel} and returning the result.
     *
     * @param {Number} x
     * @param {Number} y
     * @param {Number} channel
     * @returns {Number|null}
     */
    spatialSampleChannel(x: number, y: number, channel: number): number | null {
        const [
            m11, m12, m13,
            m21, m22, m23,
        ] = this.inverseMatrix;
        let sx = m11 * x + m12 * y + m13;
        let sy = m21 * x + m22 * y + m23;

        // after applying the matrix there could be a bit of data error so
        // nudge it towards toward [0, 1] to see if it likely fell into range
        if (sx < 0) {
            sx += Number.EPSILON;
        }

        if (sx > 1) {
            sx -= Number.EPSILON;
        }

        if (sy < 0) {
            sy += Number.EPSILON;
        }

        if (sy > 1) {
            sy -= Number.EPSILON;
        }

        if (sx < 0 || sx > 1) {
            return null;
        }

        if (sy < 0 || sy > 1) {
            return null;
        }

        return this.sampleChannel(sx, sy, channel);
    }

    /**
     * Transforms X and Y by {@link SpatialSampler2D.inverseMatrix inverseMatrix} before
     * sampling the texture using {@link @Sampler2D.sample} and returning the result.
     *
     * @param {Number} x
     * @param {Number} y
     * @param {Array} target
     * @returns {Boolean}
     */
    spatialSample(x: number, y: number, target: Array<any>): boolean {
        const [
            m11, m12, m13,
            m21, m22, m23,
        ] = this.inverseMatrix;
        let sx = m11 * x + m12 * y + m13;
        let sy = m21 * x + m22 * y + m23;

        // after applying the matrix there could be a bit of data error so
        // nudge it towards toward [0, 1] to see if it likely fell into range
        if (sx < 0) {
            sx += Number.EPSILON;
        }

        if (sx > 1) {
            sx -= Number.EPSILON;
        }

        if (sy < 0) {
            sy += Number.EPSILON;
        }

        if (sy > 1) {
            sy -= Number.EPSILON;
        }

        if (sx < 0 || sx > 1) {
            return false;
        }

        if (sy < 0 || sy > 1) {
            return false;
        }

        return this.sample(sx, sy, target);
    }

    /**
     * Sets `inverseMatrix` to transform from a span of min to max x and y into
     * the span [ 0, 1 ].
     *
     * @param {Number} minX
     * @param {Number} minY
     * @param {Number} maxX
     * @param {Number} maxY
     */
    setMinMax(minX: number, minY: number, maxX: number, maxY: number) {
        const sizeX = maxX - minX;
        const sizeY = maxY - minY;

        // The transform matrix for going from [ 0, 1 ] -> world frame would be
        // [ sizeX, 0,     minX ]
        // [ 0,     sizeY, minY ]
        // [ 0,     0,     1    ]

        // But the inverse of the matrix to go from world frame -> [ 0, 1 ] is
        // [ 1 / sizeX, 0,         - minX / sizeX ]
        // [ 0,         1 / sizeY, - minY / sizeY ]
        // [ 0,         0,         1              ]

        this.inverseMatrix = [
            1 / sizeX, 0, - minX / sizeX,
            0, 1 / sizeY, - minY / sizeY,
            0, 0, 1,
        ];
    }
}
