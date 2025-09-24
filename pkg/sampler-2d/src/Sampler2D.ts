import { TypedArray } from "@gov.nasa.jpl.honeycomb/common";
import {
    BufferGeometry
} from 'three';

function lerp(a: number, b: number, t: number) {
    return a * (1 - t) + b * t;
}

function isEven(a: number) {
    return a % 2 === 0;
}

function boxFilter(
    x: number,
    values0: number[],
    values1: number[],
    values2: number[],
    currentWidth: number,
    target: number[]
) {
    // values0, 1, 2, are the values for pixels 2 * x, 2 * x + 1, 2 * x + 2 in the parent mipmap
    // parentWidth is the width of the parent mipmap
    const n = currentWidth;
    const w0 = (n - x) / (2 * n + 1);
    const w1 = n / (2 * n + 1);
    const w2 = (1 + x) / (2 * n + 1);
    for (let i = 0, l = values0.length; i < l; i++) {
        target[i] =
            values0[i] * w0 +
            values1[i] * w1 +
            values2[i] * w2;
    }
}

// for .sample
const tempArray1: number[] = [];
const tempArray2: number[] = [];
const tempArray3: number[] = [];

// for .generateMipmap
const mipArray: number[] = [];

// for .generateMipmap NPOT branch
const mipArray0: number[] = [];
const mipArray1: number[] = [];
const mipArray2: number[] = [];

const yMipArray0: number[] = [];
const yMipArray1: number[] = [];
const yMipArray2: number[] = [];

/**
 * Texture-like object with an API for sampling image data.
 *
 * For simplicity image data should be thought about as `0 0` being the bottom left pixel
 * of the image. Use `xInvert` or `yInvert` to flip the image if necessary. Data is assumed to
 * be interleaved.
 */
export class Sampler2D extends BufferGeometry {
    /**
     * The height of the data grid as derived from the data length, stride, and width.
     * @member {Number}
     */
    height: number;

    /**
     * Whether the data should be sampled as row major (`true`) or column major (`false`).
     * @member {Boolean}
     * @default true
     */
    rowMajor: boolean;

    /**
     * Whether the data should be inverted along X.
     * @member {Boolean}
     * @default false
     */
    invertX: boolean;

    /**
     * Whether the data should be inverted along Y.
     * @member {boolean}
     * @default false
     */
    invertY: boolean;

    /**
     * If `true`, then the result of sampling is bilinearly interpolated between the adjacent pixels.
     * @member {boolean}
     * @default true
     */
    interpolate: boolean;

    /**
     * Return the number of channels in the image.
     * @member {Number}
     */
    get channels() {
        return this.stride;
    }

    /**
     * @param {TypedArray} data The image data.
     * @param {Number} width The width of the data grid.
     * @param {Number} [stride=4] The stride of a single pixel vector in the array.
     */
    constructor(
        public data: TypedArray,
        public width: number,
        public stride: number = 4
    ) {
        super();
        this.height = data.length / (width * stride);
        this.rowMajor = true;
        this.invertX = false;
        this.invertY = false;
        this.interpolate = true;
    }

    setMinMax(_minX: number, _minY: number, _maxX: number, _maxY: number) {
    }

    protected modifier(cell: number): number {
        return cell;
    }

    /**
     * X is expected to be in the range `[ 0, width ]` and Y within `[ 0, height ]`. Sets `target` to the pixel value at
     * the given pixel. Decimal values are not supported.
     *
     * Returns `null` if the provided values are outside a valid range. Returns the sample value otherwise.
     * @param {Number} x
     * @param {Number} y
     * @param {Number} channel
     * @returns {Number|null}
     */
    samplePixelChannel(x: number, y: number, channel: number): number | null {
        const width = this.width;
        const height = this.height;
        const stride = this.stride;

        if (x > width - 1 || x < 0) {
            return null;
        }

        if (y > height - 1 || y < 0) {
            return null;
        }

        if (channel < 0 || channel >= stride) {
            return null;
        }

        if (this.invertX) {
            x = width - x - 1;
        }

        if (this.invertY) {
            y = height - y - 1;
        }

        const data = this.data;
        const rowMajor = this.rowMajor;
        const pixelIndex = rowMajor ? y * width + x : x * height + y;
        const arrayIndex = pixelIndex * stride;
        return this.modifier(data[arrayIndex + channel]);
    }

    /**
     * X is expected to be in the range `[ 0, width ]` and Y within `[ 0, height ]`. Sets `target` to the pixel value at
     * the given pixel. Decimal values are not supported.
     *
     * Returns `false` if the provided values are outside a valid range. Returns `true` otherwise.
     * @param {Number} x
     * @param {Number} y
     * @param {Array} target
     * @returns {Boolean}
     */
    samplePixel(x: number, y: number, target: Array<any>): boolean {
        const width = this.width;
        const height = this.height;

        if (x > width - 1 || x < 0) {
            return false;
        }

        if (y > height - 1 || y < 0) {
            return false;
        }

        if (this.invertX) {
            x = width - x - 1;
        }

        if (this.invertY) {
            y = height - y - 1;
        }

        const data = this.data;
        const stride = this.stride;
        const rowMajor = this.rowMajor;
        const pixelIndex = rowMajor ? y * width + x : x * height + y;
        const arrayIndex = pixelIndex * stride;

        target.length = stride;
        for (let i = 0; i < stride; i++) {
            target[i] = this.modifier(data[arrayIndex + i]);
        }

        return true;
    }

    /**
     * U  and V are expected to be in the range `[ 0, 1 ]`. Reads and interpolates the pixels if
     * {@link #Sampler2D#interpolate interpolate} is true.
     *
     * Returns `null` if the provided values are outside a valid range. Returns the sample value otherwise.
     * @param {Number} u
     * @param {Number} v
     * @param {Number} channel
     * @returns {Number|null}
     */
    sampleChannel(u: number, v: number, channel: number): number | null {
        if (u < 0 || u > 1) {
            return null;
        }

        if (v < 0 || v > 1) {
            return null;
        }

        const stride = this.stride;
        if (channel < 0 || channel >= stride) {
            return null;
        }

        const interpolate = this.interpolate;
        const width = this.width;
        const height = this.height;

        // get the pixel position between the upper and lower bounds
        // of the pixel
        let xPixel = u * width;
        let yPixel = v * height;
        if (interpolate) {
            // offset so we know which "side" of the pixel center we are on to
            // properly sample.
            xPixel -= 0.5;
            yPixel -= 0.5;

            let xMin = Math.floor(xPixel);
            let yMin = Math.floor(yPixel);
            let xMax = xMin + 1;
            let yMax = yMin + 1;

            xMin = xMin < 0 ? 0 : xMin;
            yMin = yMin < 0 ? 0 : yMin;
            xMax = xMax >= width ? width - 1 : xMax;
            yMax = yMax >= height ? height - 1 : yMax;

            const xLerp = xPixel % 1.0;
            const yLerp = yPixel % 1.0;

            const x1 = this.samplePixelChannel(xMin, yMax, channel)!;
            const x2 = this.samplePixelChannel(xMax, yMax, channel)!;
            const value1 = lerp(x1, x2, xLerp);

            const x3 = this.samplePixelChannel(xMin, yMin, channel)!;
            const x4 = this.samplePixelChannel(xMax, yMin, channel)!;
            const value2 = lerp(x3, x4, xLerp);
            return lerp(value2, value1, yLerp);
        } else {
            if (xPixel === width) {
                xPixel -= 1;
            }
            if (yPixel === height) {
                yPixel -= 1;
            }
            return this.samplePixelChannel(~~xPixel, ~~yPixel, channel);
        }
    }

    /**
     * U  and V are expected to be in the range `[ 0, 1 ]`. Reads and interpolates the pixels if
     * {@link #Sampler2D#interpolate interpolate} is true.
     *
     * Returns `false` if the provided values are outside a valid range. Returns `true` otherwise.
     * @param {Number} u
     * @param {Number} v
     * @param {Array} target
     * @returns {Boolean}
     */
    sample(u: number, v: number, target: number[]): boolean {
        if (u < 0 || u > 1) {
            return false;
        }

        if (v < 0 || v > 1) {
            return false;
        }

        const interpolate = this.interpolate;
        const width = this.width;
        const height = this.height;

        // get the pixel position between the upper and lower bounds
        // of the pixel
        let xPixel = u * width;
        let yPixel = v * height;
        if (interpolate) {
            const stride = this.stride;
            target.length = stride;
            tempArray1.length = stride;
            tempArray2.length = stride;
            tempArray3.length = stride;

            // offset so we know which "side" of the pixel center we are on to
            // properly sample.
            xPixel -= 0.5;
            yPixel -= 0.5;

            let xMin = Math.floor(xPixel);
            let yMin = Math.floor(yPixel);
            let xMax = xMin + 1;
            let yMax = yMin + 1;

            xMin = xMin < 0 ? 0 : xMin;
            yMin = yMin < 0 ? 0 : yMin;
            xMax = xMax >= width ? width - 1 : xMax;
            yMax = yMax >= height ? height - 1 : yMax;

            const xLerp = xPixel % 1.0;
            const yLerp = yPixel % 1.0;

            this.samplePixel(xMin, yMax, tempArray1);
            this.samplePixel(xMax, yMax, tempArray2);
            for (let i = 0; i < stride; i++) {
                tempArray3[i] = lerp(tempArray1[i], tempArray2[i], xLerp);
            }

            this.samplePixel(xMin, yMin, tempArray1);
            this.samplePixel(xMax, yMin, tempArray2);
            for (let i = 0; i < stride; i++) {
                target[i] = lerp(tempArray1[i], tempArray2[i], xLerp);
                target[i] = lerp(target[i], tempArray3[i], yLerp);
            }
        } else {
            if (xPixel === width) {
                xPixel -= 1;
            }
            if (yPixel === height) {
                yPixel -= 1;
            }
            this.samplePixel(~~xPixel, ~~yPixel, target);
        }

        return true;
    }

    /**
     * Creates a mip map of this Sampler2D. If the dimensions of this sampler are not
     * a factor of two then weighted sampling over multiple pixels are used and a
     * square mipmap is generated.
     * @param {Sampler2D} [target=null]
     */
    generateMipMap(target?: Sampler2D) {
        // TODO: Provide fast path if there's only a single channel
        if (this.width === 1 || this.height === 1) {
            return null;
        }

        const parentWidth = this.width;
        const parentHeight = this.height;
        const width = Math.floor(parentWidth / 2);
        const height = Math.floor(parentHeight / 2);
        const stride = this.stride;
        const length = width * height * stride;

        if (
            !target ||
            (target.data.constructor !== this.data.constructor && target.data.length !== length)
        ) {
            const data = this.data.constructor(length);
            target = new Sampler2D(data, width, stride);
        }

        target.width = width;
        target.height = height;
        target.stride = stride;

        const ogInterpolate = this.interpolate;
        const ogRowMajor = this.rowMajor;

        this.interpolate = true;
        this.rowMajor = true;

        const parentTexelWidth = 1 / parentWidth;
        const parentTexelHeight = 1 / parentHeight;
        const targetData = target.data;

        if (isEven(parentWidth) && isEven(parentHeight)) {
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    this.sample(
                        parentTexelWidth + x / width,
                        parentTexelHeight + y / height,
                        mipArray
                    );
                    const offset = (y * width + x) * stride;
                    for (let i = 0; i < stride; i++) {
                        targetData[offset + i] = mipArray[i];
                    }
                }
            }
        } else {
            const halfParentTexelWidth = parentTexelWidth / 2.0;
            const halfParentTexelHeight = parentTexelHeight / 2.0;

            mipArray.length = stride;
            mipArray0.length = stride;
            mipArray1.length = stride;
            mipArray2.length = stride;
            yMipArray0.length = stride;
            yMipArray1.length = stride;
            yMipArray2.length = stride;
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    // https://www.nvidia.com/en-us/drivers/np2-mipmapping/

                    // if the current width is non power of two then generate
                    // a sample using boxFilter for each needed y value. If y is power
                    // of two as well then just use a dummy array for the third
                    // field because it won't be used.

                    const sx0 = 2 * x;
                    const sx1 = 2 * x + 1;
                    const sx2 = 2 * x + 2;

                    const sy0 = 2 * y;
                    const sy1 = 2 * y + 1;
                    const sy2 = 2 * y + 2;

                    if (isEven(parentWidth)) {
                        // because x is power of two just use basic linear sampling but fix y
                        // in the center of the pixel for exact values
                        const fixedXPoint = parentTexelWidth + x / width;
                        this.sample(
                            fixedXPoint,
                            halfParentTexelHeight + sy0 / parentHeight,
                            mipArray0,
                        );
                        this.sample(
                            fixedXPoint,
                            halfParentTexelHeight + sy1 / parentHeight,
                            mipArray1,
                        );
                        this.sample(
                            fixedXPoint,
                            halfParentTexelHeight + sy2 / parentHeight,
                            mipArray2,
                        );
                        boxFilter(x, mipArray0, mipArray1, mipArray2, width, mipArray);
                    } else if (isEven(parentHeight)) {
                        // because y is power of two just use basic linear sampling but fix x
                        // in the center of the pixel for exact values
                        const fixedVPoint = parentTexelHeight + y / height;
                        this.sample(
                            halfParentTexelWidth + sx0 / parentWidth,
                            fixedVPoint,
                            mipArray0,
                        );
                        this.sample(
                            halfParentTexelWidth + sx1 / parentWidth,
                            fixedVPoint,
                            mipArray1,
                        );
                        this.sample(
                            halfParentTexelWidth + sx2 / parentWidth,
                            fixedVPoint,
                            mipArray2,
                        );
                        boxFilter(y, mipArray0, mipArray1, mipArray2, height, mipArray);
                    } else {
                        const fixedVPoint0 = sy0;
                        const fixedVPoint1 = sy1;
                        const fixedVPoint2 = sy2;

                        const fixedUPoint0 = sx0;
                        const fixedUPoint1 = sx1;
                        const fixedUPoint2 = sx2;

                        // sample the top pixel across
                        this.samplePixel(fixedUPoint0, fixedVPoint0, mipArray0);
                        this.samplePixel(fixedUPoint1, fixedVPoint0, mipArray1);
                        this.samplePixel(fixedUPoint2, fixedVPoint0, mipArray2);
                        boxFilter(x, mipArray0, mipArray1, mipArray2, width, yMipArray0);

                        // sample the middle pixel across
                        this.samplePixel(fixedUPoint0, fixedVPoint1, mipArray0);
                        this.samplePixel(fixedUPoint1, fixedVPoint1, mipArray1);
                        this.samplePixel(fixedUPoint2, fixedVPoint1, mipArray2);
                        boxFilter(x, mipArray0, mipArray1, mipArray2, width, yMipArray1);

                        // sample the bottom pixel across
                        this.samplePixel(fixedUPoint0, fixedVPoint2, mipArray0);
                        this.samplePixel(fixedUPoint1, fixedVPoint2, mipArray1);
                        this.samplePixel(fixedUPoint2, fixedVPoint2, mipArray2);
                        boxFilter(x, mipArray0, mipArray1, mipArray2, width, yMipArray2);

                        // sample the pixels down
                        boxFilter(y, yMipArray0, yMipArray1, yMipArray2, height, mipArray);
                    }

                    const offset = (y * width + x) * stride;
                    for (let i = 0; i < stride; i++) {
                        targetData[offset + i] = mipArray[i];
                    }
                }
            }
        }

        this.interpolate = ogInterpolate;
        this.rowMajor = ogRowMajor;

        target.interpolate = ogInterpolate;
        target.rowMajor = ogRowMajor;
        return target;
    }
}
