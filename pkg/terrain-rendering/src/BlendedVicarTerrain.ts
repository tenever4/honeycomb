import { VicarResult, loadVicorLabel } from '@gov.nasa.jpl.honeycomb/vicar-loader';

import { HeightMapTerrain } from './base/HeightMapTerrain';
import { Vector2, MathUtils, BufferGeometry } from 'three';

class BlendedVicarTerrain extends HeightMapTerrain {
    resolution: number;
    heightLayer: number;
    confidenceLayer: number;
    images: VicarResult[];

    constructor() {
        super();
        this.images = [];
        this.resolution = 0.1;
        this.heightLayer = 1;
        this.confidenceLayer = 2;
    }

    updateGeometry(geometry: BufferGeometry) {
        const images = this.images;
        const resolution = this.resolution;

        const maxBounds = new Vector2(-Infinity, -Infinity);
        const minBounds = new Vector2(Infinity, Infinity);
        const cache = images.map(im => {
            const { width, height, data } = im;
            const X_AXIS_MINIMUM = loadVicorLabel<number>(im, "X_AXIS_MINIMUM");
            const Y_AXIS_MINIMUM = loadVicorLabel<number>(im, "Y_AXIS_MINIMUM");
            const MAP_SCALE = loadVicorLabel<number>(im, "MAP_SCALE");
            const min = new Vector2(X_AXIS_MINIMUM, Y_AXIS_MINIMUM);
            const max = new Vector2(
                X_AXIS_MINIMUM + width * MAP_SCALE,
                Y_AXIS_MINIMUM + height * MAP_SCALE,
            );

            minBounds.x = Math.min(minBounds.x, min.x);
            minBounds.y = Math.min(minBounds.y, min.y);

            maxBounds.x = Math.max(maxBounds.x, max.x);
            maxBounds.y = Math.max(maxBounds.y, max.y);

            return { min, max, width, height, data };
        });

        const xCount = Math.ceil((maxBounds.x - minBounds.x) / resolution);
        const yCount = Math.ceil((maxBounds.y - minBounds.y) / resolution);

        this._setGridDimensions(geometry, xCount, yCount);
        if ('normal' in geometry.attributes) {
            geometry.deleteAttribute('normal').dispose();
        }

        if ('uv' in geometry.attributes) {
            geometry.deleteAttribute('uv').dispose();
        }

        const confidenceLayer = this.confidenceLayer;
        const heightLayer = this.heightLayer;
        const posAttr = geometry.attributes.position;
        const arr = (posAttr as any).array;
        for (let x = 0; x < xCount; x++) {
            for (let y = 0; y < yCount; y++) {
                const xRatio = x / (xCount - 1);
                const yRatio = y / (yCount - 1);

                const xPos = minBounds.x + (maxBounds.x - minBounds.x) * xRatio;
                const yPos = minBounds.y + (maxBounds.y - minBounds.y) * yRatio;

                const gIndex = xCount * (yCount - y - 1) + x;
                arr[3 * gIndex + 0] = xPos;
                arr[3 * gIndex + 1] = yPos;

                let zVal = 0;
                for (let c = 0, lc = cache.length; c < lc; c++) {
                    const { width, height, data, min, max } = cache[c];

                    if (xPos < min.x || xPos > max.x || yPos < min.y || yPos > max.y) {
                        continue;
                    }

                    // index into the given layers data
                    const confidenceOffset = width * height * confidenceLayer;
                    const interpolatedOffset = width * height * heightLayer;

                    const ratX = (xPos - min.x) / (max.x - min.x);
                    const ratY = (yPos - min.y) / (max.y - min.y);
                    const sampleX = (width - 1) * ratX;
                    const sampleY = (height - 1) * ratY;

                    const interpX = sampleX % 1;
                    const interpY = sampleY % 1;

                    const minSampleX = ~~sampleX;
                    const maxSampleX = Math.min(width - 1, minSampleX + 1);

                    const minSampleY = ~~sampleY;
                    const maxSampleY = Math.min(height - 1, minSampleY + 1);

                    const topLeftIndex = width * minSampleY + minSampleX;
                    const topRightIndex = width * minSampleY + maxSampleX;
                    const botLeftIndex = width * maxSampleY + minSampleX;
                    const botRightIndex = width * maxSampleY + maxSampleX;

                    const topConfVal = MathUtils.lerp(
                        data[confidenceOffset + topLeftIndex],
                        data[confidenceOffset + topRightIndex],
                        interpX,
                    );

                    const botConfVal = MathUtils.lerp(
                        data[confidenceOffset + botLeftIndex],
                        data[confidenceOffset + botRightIndex],
                        interpX,
                    );

                    const confVal = MathUtils.lerp(topConfVal, botConfVal, interpY) / 255;

                    const topInterpVal = MathUtils.lerp(
                        data[interpolatedOffset + topLeftIndex],
                        data[interpolatedOffset + topRightIndex],
                        interpX,
                    );

                    const botInterpVal = MathUtils.lerp(
                        data[interpolatedOffset + botLeftIndex],
                        data[interpolatedOffset + botRightIndex],
                        interpX,
                    );

                    const interpVal = MathUtils.lerp(topInterpVal, botInterpVal, interpY);

                    zVal = MathUtils.lerp(zVal, interpVal, confVal);
                }

                arr[3 * gIndex + 2] = zVal;
            }
        }

        posAttr.needsUpdate = true;
    }
}

export { BlendedVicarTerrain };
