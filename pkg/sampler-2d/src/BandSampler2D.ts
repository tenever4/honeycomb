import { Sampler2D } from "./Sampler2D";
import { SpatialSampler2D } from "./SpatialSampler2D";

/**
 * A sampler that stores each channel as a separate sampler and samples
 * data accordingly. Use this if image data is not provided as interleaved.
 *
 * @implements {Sampler2D}
 */
export class BandSampler2D {
    get stride() {
        return this.bands.length;
    }

    get channels() {
        return this.stride;
    }

    // TODO: Just set the value recursively instead of just doing a temporary set
    /** @todo */
    // set rowMajor(v) {
    //     throw new Error();
    // }

    // /** @todo */
    // set invertX(v) {
    //     throw new Error();
    // }

    // /** @todo */
    // set invertY(v) {
    //     throw new Error();
    // }

    interpolate: boolean;

    /**
     * @param {Array<Sampler2D>} [bands=[]] Array of sampler 2d instances where each band corresponds to a different channel.
     */
    constructor(public bands: Sampler2D[] = []) {
        this.interpolate = true;
    }

    setMinMax(minX: number, minY: number, maxX: number, maxY: number) {
        for (const band of this.bands) {
            band.setMinMax(minX, minY, maxX, maxY);
        }
    }

    samplePixelChannel(x: number, y: number, channel: number) {
        const bands = this.bands;
        if (channel < 0 || channel >= bands.length) {
            return null;
        }

        return bands[channel].samplePixelChannel(x, y, 0);
    }

    samplePixel(u: number, v: number, target: number[]) {
        const bands = this.bands;
        target.length = bands.length;

        let exists = true;
        for (let i = 0, l = bands.length; i < l; i++) {
            const result = this.samplePixelChannel(u, v, i);
            target[i] = result!;
            exists = exists && result !== null;
        }

        return exists;
    }

    sampleChannel(x: number, y: number, channel: number) {
        const bands = this.bands;
        if (channel < 0 || channel >= bands.length) {
            return null;
        }

        const interpolate = this.interpolate;
        const band = bands[channel];
        const ogInterpolate = band.interpolate;

        band.interpolate = interpolate;
        const result = band.sampleChannel(x, y, 0);
        band.interpolate = ogInterpolate;

        return result;
    }

    sample(u: number, v: number, target: number[]) {
        const bands = this.bands;
        target.length = bands.length;

        let exists = true;
        for (let i = 0, l = bands.length; i < l; i++) {
            const result = this.sampleChannel(u, v, 0);
            target[i] = result!;
            exists = exists && result !== null;
        }

        return exists;
    }

    spatialSampleChannel(x: number, y: number, channel: number) {
        const bands = this.bands;
        if (channel < 0 || channel >= bands.length) {
            return null;
        }

        const interpolate = this.interpolate;
        const band = bands[channel];
        const ogInterpolate = band.interpolate;

        band.interpolate = interpolate;
        const result = (band as SpatialSampler2D).spatialSampleChannel(x, y, 0);
        band.interpolate = ogInterpolate;

        return result;
    }

    spatialSample(x: number, y: number, target: number[]) {
        const bands = this.bands;
        target.length = bands.length;

        let exists = true;
        for (let i = 0, l = bands.length; i < l; i++) {
            const result = this.spatialSampleChannel(x, y, i);
            target[i] = result!;
            exists = exists && result !== null;
        }

        return exists;
    }
}
