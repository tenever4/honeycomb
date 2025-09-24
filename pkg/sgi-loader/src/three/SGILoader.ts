import { SGILoaderBase, SGIResult } from '../base/SGILoaderBase';
import {
    DataTexture,
    RGBAFormat,
    RGFormat,
    RedFormat,
    UnsignedByteType,
    UnsignedShortType,
    LinearFilter,
    LinearMipmapLinearFilter,
    DefaultLoadingManager,
    LoadingManager,
} from 'three';

/**
 * A three.js implementation of SGILoader that returns a data texture rather than raw results.
 */
export class SGILoader {
    private baseLoader: SGILoaderBase;

    /**
     * @param {LoadingManager} manager
     */
    constructor(private manager: LoadingManager = DefaultLoadingManager) {
        this.baseLoader = new SGILoaderBase();
    }

    /**
     * Loads and parses the SGI file and returns a DataTexture. If a DataTexture is passed into
    * the function the data is applied to it.
     * @param {String} url
     * @param {DataTexture} texture
     * @returns {DataTexture}
     */
    load(url: string, texture: DataTexture = new DataTexture()): DataTexture {
        const manager = this.manager;
        manager.itemStart(url);
        this.baseLoader.load(url).then(result => {
            texture.copy(this.parse(result));
            texture.needsUpdate = true;
        }).catch(err => {
            console.error(err);
            manager.itemError(url);
        }).finally(() => {
            manager.itemEnd(url);
        });
        return texture;
    }

    /**
     * Parses the contents of the given SGI contents and returns a texture.
     * @param {ArrayBuffer|Uint8Array} result
     * @param {DataTexture} texture
     * @returns {DataTexture}
     */
    parse(result: SGIResult, texture = new DataTexture()) {
        texture.image = {
            width: result.width,
            height: result.height,
            data: Uint8ClampedArray.from(result.data)
        };

        texture.generateMipmaps = true;
        texture.minFilter = LinearMipmapLinearFilter;
        texture.magFilter = LinearFilter;
        texture.type = result.data.BYTES_PER_ELEMENT === 1 ? UnsignedByteType : UnsignedShortType;

        switch (result.channels) {
            case 1:
                texture.format = RedFormat;
                break;
            case 2:
                texture.format = RGFormat;
                break;
            case 3: {
                // three.js no long supports RGBFormat so conver the data to
                // 4 channel data.
                const { width, height, data } = result;
                const newData = data.constructor(width * height * 4);
                const maxValue = Math.pow(2, newData.BYTES_PER_ELEMENT * 8);
                for (let i = 0, l = data.length; i < l; i += 3) {
                    newData[i + 0] = data[i + 0];
                    newData[i + 1] = data[i + 1];
                    newData[i + 2] = data[i + 2];
                    newData[i + 3] = maxValue;
                }

                texture.format = RGBAFormat;
                texture.image = {
                    ...texture.image,
                    data: newData
                };
                break;
            }
            case 4:
                texture.format = RGBAFormat;
                break;
        }
        texture.needsUpdate = true;

        return texture;
    }
}
