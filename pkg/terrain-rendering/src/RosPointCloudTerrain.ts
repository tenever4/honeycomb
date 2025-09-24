import { BufferAttribute, BufferGeometry, Material, PointsMaterial } from 'three';
import { RenderMode, Terrain } from './base/Terrain';
import { Ros } from '@gov.nasa.jpl.honeycomb/common';

export interface RosPointCloudTerrainOptions {
    pointSize: number;
    attenuate: boolean;
}

// TODO: Support InterleavedBufferAttributes here
/**
 * TODO
 * @extends Terrain
 */
class RosPointCloudTerrain extends Terrain {
    constructor(private pointCloud: Ros.PointCloud2, options?: RosPointCloudTerrainOptions) {
        super();

        options = options ?? { pointSize: 0.1, attenuate: true };

        this.renderMode = RenderMode.POINTS;
        (this.points.material as PointsMaterial).size = options.pointSize;
        (this.points.material as PointsMaterial).defines!.USE_SIZEATTENUATION = Number(options.attenuate);
        this.traverse(c => {
            c.receiveShadow = true;
        });
    }

    updatePointCloud(pointCloud: Ros.PointCloud2) {
        this.pointCloud = pointCloud;
        this.update();
        this.visible = true;
    }

    updateGeometry(geometry: BufferGeometry) {
        // Ros Bridge transfers data as strings
        let data = this.pointCloud.data;
        if (typeof data === 'string') {
            // https://stackoverflow.com/questions/21797299/
            data = Uint8Array.from(atob(data), c => c.charCodeAt(0));
        }
        const fieldMap: Record<string, Ros.PointCloudField> = {};
        this.pointCloud.fields.map(f => (fieldMap[f.name] = f));

        if (fieldMap.x.datatype !== 7 || fieldMap.y.datatype !== 7 || fieldMap.z.datatype !== 7) {
            throw new Error('Point data in non-float format not supported');
        }

        if (fieldMap.intensity && fieldMap.intensity.datatype !== 7) {
            throw new Error('Intensity data in non-float format not supported');
        }

        if (fieldMap.rgb && fieldMap.rgb.datatype !== 7) {
            throw new Error('RGB data in non-float format not supported');
        }

        const pointStride = this.pointCloud.point_step;
        const littleEndian = !this.pointCloud.is_bigendian;

        const len = data.length / pointStride;
        const posArr = new Float32Array(len * 3);
        const colArr = (fieldMap.intensity || fieldMap.rgb) ? new Uint8Array(len * 3) : null;
        const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);

        const xOffset = fieldMap.x.offset;
        const yOffset = fieldMap.y.offset;
        const zOffset = fieldMap.z.offset;
        const intensityOffset = (fieldMap.intensity && fieldMap.intensity.offset) || null;
        const rgbOffset = (fieldMap.rgb && fieldMap.rgb.offset) || null;

        // Apply the coloring to the point clouds
        // Only relevant if there is color/intensity data data
        if (colArr) {
            for (let i = 0; i < len; i++) {
                posArr[i * 3 + 0] = dataView.getFloat32(i * pointStride + xOffset, littleEndian);
                posArr[i * 3 + 1] = dataView.getFloat32(i * pointStride + yOffset, littleEndian);
                posArr[i * 3 + 2] = dataView.getFloat32(i * pointStride + zOffset, littleEndian);

                if (intensityOffset !== null) {
                    // TODO: While this is a float it seems to be ranged from 0.0 to 255.0? Is this typical?
                    const col = dataView.getFloat32(i * pointStride + intensityOffset, littleEndian);
                    colArr[i * 3 + 0] = col;
                    colArr[i * 3 + 1] = col;
                    colArr[i * 3 + 2] = col;
                }

                if (rgbOffset !== null) {
                    colArr[i * 3 + 0] = dataView.getUint8(
                        i * pointStride + rgbOffset + 0
                    );
                    colArr[i * 3 + 1] = dataView.getUint8(
                        i * pointStride + rgbOffset + 1
                    );
                    colArr[i * 3 + 2] = dataView.getUint8(
                        i * pointStride + rgbOffset + 2
                    );
                }
            }
        }

        const geom = geometry;
        const attr = new BufferAttribute(posArr, 3, false);
        geom.setAttribute('position', attr);

        // TODO: Reuse these buffers if possible -- maybe use interleaved buffer attributes, too.
        // TODO: This shouldn't be handled by the terrain -- the containing app should handle this.
        const mat = this.points.material as Material;
        const wasVertexColors = mat.vertexColors;
        if (colArr) {
            const colAttr = new BufferAttribute(colArr, 3, true);
            geom.setAttribute('color', colAttr);
            mat.vertexColors = true;
        } else {
            geom.deleteAttribute('color');
            mat.vertexColors = false;
        }

        mat.needsUpdate = wasVertexColors !== mat.vertexColors;
    }
}

export { RosPointCloudTerrain };
