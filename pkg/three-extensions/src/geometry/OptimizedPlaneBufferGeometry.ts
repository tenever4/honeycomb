// Base implementation taken and modified from
// https://github.com/mrdoob/three.js/commit/764bc3dbbc57b696277b77e648be3857ca3e4b25

import { BufferGeometry, BufferAttribute } from 'three';

/**
 * A copy of three.js' {@link https://threejs.org/docs/#api/en/geometries/PlaneBufferGeometry PlaneBufferGeometry}
 * modified to immediately write to 32 bit buffers and excludes uv and normal attributes to save
 * build and run time memory.
 *
 * @extends BufferGeometry
 */
export class OptimizedPlaneBufferGeometry extends BufferGeometry {
    /**
     * Specifies the spatial width and height as well as the number of grid segments
     * in the plane on the x and y axis.
     *
     * @param {Number} width
     * @param {Number} height
     * @param {Number} widthSegments
     * @param {Number} heightSegments
     */
    constructor(width: number = 1, height: number = 1, widthSegments: number = 1, heightSegments: number = 1) {
        super();

        const width_half = width / 2;
        const height_half = height / 2;

        const gridX = Math.floor(widthSegments) || 1;
        const gridY = Math.floor(heightSegments) || 1;

        const gridX1 = gridX + 1;
        const gridY1 = gridY + 1;

        const segment_width = width / gridX;
        const segment_height = height / gridY;

        let ix, iy;

        // buffers
        const positionCount = gridX1 * gridY1;
        const positions = new Float32Array(positionCount * 3);

        const indexCount = gridX * gridY;
        let indices;
        if (positionCount > 65535) {
            indices = new Uint32Array(indexCount * 6);
        } else {
            indices = new Uint16Array(indexCount * 6);
        }

        // generate vertices
        for (iy = 0; iy < gridY1; iy++) {
            const y = iy * segment_height - height_half;

            for (ix = 0; ix < gridX1; ix++) {
                const x = ix * segment_width - width_half;
                const i = iy * gridX1 + ix;
                const i3 = i * 3;

                positions[i3 + 0] = x;
                positions[i3 + 1] = -y;
                positions[i3 + 2] = 0;
            }
        }

        // indices
        for (iy = 0; iy < gridY; iy++) {
            for (ix = 0; ix < gridX; ix++) {
                const a = ix + gridX1 * iy;
                const b = ix + gridX1 * (iy + 1);
                const c = ix + 1 + gridX1 * (iy + 1);
                const d = ix + 1 + gridX1 * iy;

                const i = iy * gridX + ix;
                const i6 = i * 6;
                indices[i6 + 0] = a;
                indices[i6 + 1] = b;
                indices[i6 + 2] = d;
                indices[i6 + 3] = b;
                indices[i6 + 4] = c;
                indices[i6 + 5] = d;
            }
        }

        // build geometry
        this.setIndex(new BufferAttribute(indices, 1, false));
        this.setAttribute('position', new BufferAttribute(positions, 3, false));

        // https://github.com/mrdoob/three.js/issues/21483
        // shadows will not work for some graphics cards unless normals
        // are explicitly set
        const normalFloatArr = new Float32Array(positionCount *3);
        for (let i = 2; i < positionCount * 3; i += 3) {
            normalFloatArr[i] = 1;
        }
        this.setAttribute('normal', new BufferAttribute(normalFloatArr, 3, false));
    }
}
