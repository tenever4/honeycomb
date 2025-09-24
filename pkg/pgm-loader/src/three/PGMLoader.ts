import { PGMLoaderBase, type PGMResult } from '../base/PGMLoaderBase';
import {
    DataTexture,
    DefaultLoadingManager,
    UnsignedByteType,
    HalfFloatType,
    SRGBColorSpace,
    LuminanceFormat,
    LinearFilter,
    LinearMipMapLinearFilter,
    LoadingManager
} from 'three';

/**
 * Three.js implementation of PGMLoaderBase.
 */
export class PGMLoader {
    private _loader: PGMLoaderBase;

    constructor(public readonly manager: LoadingManager = DefaultLoadingManager) {
        this._loader = new PGMLoaderBase();
    }

    /**
     * Loads and parses the PGM file and returns a DataTexture. If a DataTexture is passed into
     * the function the data is applied to it.
     */
    load(url: string, texture: DataTexture = new DataTexture()): DataTexture {
        const manager = this.manager;
        manager.itemStart(url);
        this._loader.load(url).then(result => {
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
     * Parses the contents of the given PGM file and returns a texture with the
     * contents.
     * @param {Uint8Array | ArrayBuffer} buffer
     * @param {DataTexture} texture
     * @returns {DataTexture}
     */
    parse(buffer: Uint8Array | ArrayBuffer | PGMResult, texture: DataTexture = new DataTexture()): DataTexture {
        let result = buffer;
        if (buffer instanceof ArrayBuffer || buffer instanceof Uint8Array) {
            result = this._loader.parse(buffer);
        }

        result = result as PGMResult;

        // TODO: if type if HalfFloatType then do the values need to be normalized by maxValue?
        texture.image = {
            width: result.width,
            height: result.height,
            data: new Uint8ClampedArray(result.data)
        };
        texture.minFilter = LinearMipMapLinearFilter;
        texture.magFilter = LinearFilter;
        texture.type = result.data.BYTES_PER_ELEMENT === 1 ? UnsignedByteType : HalfFloatType;
        texture.colorSpace = SRGBColorSpace;
        texture.format = LuminanceFormat;
        texture.flipY = true;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;

        return texture;
    }
}

