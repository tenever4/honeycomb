import { BufferGeometry, ShaderLibShader } from 'three';
import { Terrain } from './Terrain';
import { OptimizedPlaneBufferGeometry } from '@gov.nasa.jpl.honeycomb/three-extensions';

/**
 * Height map base class that defines a plane that can be used for
 * visualizing a height map.
 * @extends Terrain
 */
class HeightMapTerrain extends Terrain {
    protected _height: number;
    protected _width: number;

    constructor(geometry?: BufferGeometry, baseShader?: ShaderLibShader) {
        super(geometry, baseShader);

        this._height = -1;
        this._width = -1;
    }

    width() {
        return this._width;
    }

    height() {
        return this._height;
    }

    /* Private */
    /**
     * Ensures the grid dimensions are set to the given values.
     * If they are not a new plane geometry is created and the old one
     * is discarded. Returns a boolean indicating whether or not the
     * geometry was replaced.
     *
     * Private function intended to be called internally when implementing
     * {@link #Terrain#updateGeometry Terrain.updateGeometry} function.
     * @param {BufferGeometry} geometry
     * @param {Number} width
     * @param {Number} height
     * @returns {Boolean}
     */
    protected _setGridDimensions(geometry: BufferGeometry, width: number, height: number): boolean {
        if (this._width !== width || this._height !== height) {
            const newPlane = new OptimizedPlaneBufferGeometry(1, 1, width - 1, height - 1);
            const attributes = newPlane.attributes;
            const index = newPlane.index;

            // Using .copy creates a new instance of the array in every given attribute. We don't want to
            // replace the geometry entirely so references to it can be retained. Manually move the attributes
            // and everything over to avoid creating too much unnecessary duplicate memory.
            geometry.copy(newPlane);
            geometry.attributes = { ...attributes };
            geometry.index = index;
            geometry.boundingSphere = null;
            geometry.boundingBox = null;
            geometry.groups = [];

            this._width = width;
            this._height = height;
            return true;
        }
        return false;
    }
}

export { HeightMapTerrain };
