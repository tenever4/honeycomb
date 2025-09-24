import {
    Vector3,
    BufferAttribute,
    ShaderLib,
    DynamicDrawUsage,
    Material,
    BufferGeometry
} from 'three';

import { getMaterialClass as createClass, Mixins } from '@gov.nasa.jpl.honeycomb/mixin-shaders';
import { HeightMapTerrain } from './base/HeightMapTerrain';

// TODO: This isn't being used -- update it to correctly line up with the HeightMapTerrain API
const PerturbedFilterShaderMixin = Mixins.PerturbedFilterShaderMixin;

interface PointCloudDataField {
    /**
     * Offset from the start of the buffer to the first element in this field
     */
    offset: number;
}

interface PointCloudData {
    /**
     * Raw data described by 'fields'
     */
    data: Buffer;

    /**
     * 'width' & 'height' are used to optimize the graphics
     * pipelining. These can be specified to be data.length x 1
     */
    width?: number;
    height?: number;

    /**
     * Byte point difference between points in the same field
     * If the data is separated per-field, this size would be equilivalent
     * the size of each data point.
     * 
     * Otherwise you need to scale this value by the number of fields to skip
     * over the data points in the other fields.
     */
    point_step: number;

    /**
     * 
     */
    fields: [
        // X data field
        x: PointCloudDataField,

        // Y data field
        y: PointCloudDataField,

        // Z data field
        z: PointCloudDataField,

        // Color data field
        c?: PointCloudDataField
    ];
}

/**
 * TODO
 * @extends HeightMapTerrain
 */
class StructuredPointCloudTerrain extends HeightMapTerrain {
    material: Material;
    geometry: BufferGeometry;

    constructor(
        pointCloudData?: PointCloudData,
        _zScale: number = 1,
        _cellWidth: number = 1,
        material?: Material,
    ) {
        const geo = new BufferGeometry();
        super(geo);

        this.geometry = geo;

        if (pointCloudData) {
            this.setHeightMap(pointCloudData);
        }

        if (!material) {
            const PointCloudMaterial = createClass(PerturbedFilterShaderMixin(ShaderLib.lambert));
            material = new PointCloudMaterial({
                lights: true,
                vertexColors: true,
            });
        }

        this.material = material;

        // HACK: temporary hack to rotate point cloud terrain by -90 degrees
        // until we get more transform data in rosbags
        this.rotateX(Math.PI / 2);
    }

    setHeightMap(pointCloudData: PointCloudData) {
        // there is width/height in both pointCloudData and cameraData
        // but use the one in cameraData because pointCloudData width/height
        // changes each frame and can become 1 x N array instead of M x N

        const { width = pointCloudData.data.length, height = 1 } = pointCloudData;
        this._setGridDimensions(this.geometry, width, height);
        const dataView = new DataView(pointCloudData.data.buffer, pointCloudData.data.byteOffset);

        // get reference to attributes we need to update
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;
        const perturbedArray = this.geometry.attributes.perturbed.array;

        // clear out all data
        positions.fill(0);
        colors.fill(0);
        perturbedArray.fill(0);

        // position and rgb byte offsets are defined in rostopic
        const xByteOffset = pointCloudData.fields[0].offset;
        const yByteOffset = pointCloudData.fields[1].offset;
        const zByteOffset = pointCloudData.fields[2].offset;
        const rgbByteOffset = pointCloudData.fields[3]?.offset;

        for (let i = 0; i < pointCloudData.data.length; i += pointCloudData.point_step) {
            const rawPos = new Vector3(
                dataView.getFloat32(i + xByteOffset, true),
                dataView.getFloat32(i + yByteOffset, true),
                dataView.getFloat32(i + zByteOffset, true),
            );

            positions[i * 3] = rawPos.x;
            positions[i * 3 + 1] = rawPos.y;
            positions[i * 3 + 2] = rawPos.z;

            if (rgbByteOffset !== undefined) {
                colors[i * 3] = dataView.getUint8(i + rgbByteOffset);
                colors[i * 3 + 1] = dataView.getUint8(i + rgbByteOffset + 1);
                colors[i * 3 + 2] = dataView.getUint8(i + rgbByteOffset + 2);
            } else {
                // Use white points by default
                colors[i * 3] = 255;
                colors[i * 3 + 1] = 255;
                colors[i * 3 + 2] = 255;
            }

            // mark that this vertex was perturbed
            // set to 255 since this BufferAttribute will remap
            // [0, 255] to [0.0, 1.0]
            perturbedArray[i] = 255;
        }

        this.geometry.computeVertexNormals();
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        this.geometry.attributes.perturbed.needsUpdate = true;
    }

    /* Private */
    protected _setGridDimensions(geometry: BufferGeometry, width: number, height: number): boolean {
        if (this._width === width && this._height === height) {
            return false;
        }

        const out = super._setGridDimensions(geometry, width, height);

        (this.geometry.attributes.position as BufferAttribute).usage = DynamicDrawUsage;

        const colors = new Uint8Array(width * height * 3);
        const colorBufferAttribute = new BufferAttribute(colors, 3, true);
        colorBufferAttribute.usage = DynamicDrawUsage;
        this.geometry.setAttribute('color', colorBufferAttribute);

        const perturbed = new Uint8Array(width * height);
        const perturbedBufferAttribute = new BufferAttribute(perturbed, 1, true);
        perturbedBufferAttribute.usage = DynamicDrawUsage;
        this.geometry.setAttribute('perturbed', perturbedBufferAttribute);

        (this.geometry as any).needsUpdate = true;
        return out;
    }
}

export { StructuredPointCloudTerrain };
