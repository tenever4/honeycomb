import { SampledTerrain } from '@gov.nasa.jpl.honeycomb/terrain-rendering';
import { SpatialSampler2D } from '@gov.nasa.jpl.honeycomb/sampler-2d';
import { DoubleSide, Material } from 'three';
import { LoadingManager } from '@gov.nasa.jpl.honeycomb/core';

class ZOffsetSpatialSampler2D extends SpatialSampler2D {
    zOffset: number = 0;
    zScale: number = 1;
    maxValue: number = 1;

    protected modifier(cell: number): number {
        return this.zScale * (cell / this.maxValue) + this.zOffset;
    }
}

interface ZOffsetOptions {
    zOffset: number;
    zScale: number;
    maxValue: number;
    cellHeight: number;
    maxSamplesPerDimension: number;
}

function loadPGMHeightMap(path: string, options: Partial<ZOffsetOptions>, manager: LoadingManager) {
    manager.itemStart(path);

    const resolvedPath = manager.resolveURL(path);

    const pr = import('@gov.nasa.jpl.honeycomb/pgm-loader').then(({ PGMLoaderBase }) => {
        const pgmLoader = new PGMLoaderBase();
        Object.assign(pgmLoader, options);

        return pgmLoader
            .load(resolvedPath)
            .then(res => {
                // TODO: set the resolution to the cellheight? Is that correct?
                const resolution = options.cellHeight ?? 1;
                const width = res.width;
                const height = res.height;
                const width1 = width - 1;
                const height1 = height - 1;
                const zScale = options.zScale ?? 1;
                const zOffset = options.zOffset ?? 0;
                const maxValue = res.maxValue ?? Math.pow(2, res.data.BYTES_PER_ELEMENT * 8);

                // TODO: should we pull in by half a pixel here to center all
                // vertices at the center of every sample?
                const sampler = new ZOffsetSpatialSampler2D(res.data, width, 1);
                sampler.zOffset = zOffset;
                sampler.zScale = zScale;
                sampler.maxValue = maxValue;

                const terrain = new SampledTerrain(sampler);

                (terrain.mesh.material as Material).side = DoubleSide;
                (terrain.mesh.material as any).flatShading = true;
                terrain.setBounds(
                    (-width1 * resolution) / 2.0,
                    (-height1 * resolution) / 2.0,
                    (width1 * resolution) / 2.0,
                    (height1 * resolution) / 2.0,
                    0,
                );
                terrain.samples.set(width, height);
                terrain.maxSamplesPerDimension = options.maxSamplesPerDimension ?? terrain.maxSamplesPerDimension;
                terrain.sampleInWorldFrame = false;

                terrain.update();
                return terrain;
            })
            .finally(() => manager.itemEnd(path));
    });

    return pr;
}

export { loadPGMHeightMap };
