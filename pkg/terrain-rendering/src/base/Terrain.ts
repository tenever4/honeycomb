import {
    Mesh,
    Points,
    InstancedBufferAttribute,
    InstancedBufferGeometry,
    ShaderLib,
    BufferGeometry,
    ShaderLibShader,
    BoxGeometry,
} from 'three';

import { PointsShaderMixin, MeshShaderMixin } from './Materials';
import { ExtendedShaderMaterial, Mixins, Shaders } from '@gov.nasa.jpl.honeycomb/mixin-shaders';
import { SwitchGroup } from './SwitchGroup';

const { BinnedPointsMixin } = Mixins;

export enum RenderMode {
    /**
     * Render the terrain as points.
     */
    POINTS,

    /**
     * Render the terrain as a mesh.
     */
    MESH,

    /**
     * Render the terrain as instanced points.
     */
    INSTANCE_POINTS,
}

/**
 * Terrain class for rendering geometry or set of data as a mesh, points, or voxels.
 * @extends SwitchGroup
 */
export class Terrain extends SwitchGroup {
    readonly isTerrain: boolean = true;

    /**
     * An alias for {@link #SwitchGroup#active SwitchGroup.active}
     * @member {RenderMode}
     */
    set renderMode(val: number) {
        this.active = val;
    }

    get renderMode() {
        return this.active;
    }

    /**
     * Reference to the child used for rendering Points.
     * @member {Points}
     */
    get points() {
        return this.children[RenderMode.POINTS] as Points;
    }

    /**
     * Reference to the child used for rendering Mesh.
     * @member {Mesh}
     */
    get mesh() {
        return this.children[RenderMode.MESH] as Mesh;
    }

    /**
     * Reference to the child used for rendering Voxels.
     * @member {Mesh}
     */
    get instancedPoints() {
        return this.children[RenderMode.INSTANCE_POINTS] as Mesh;
    }

    /**
     * Takes the geometry and shader used to render the meshes
     */
    constructor(geometry?: BufferGeometry, baseShader: ShaderLibShader = ShaderLib.phong) {
        // mesh
        const meshShader = MeshShaderMixin(baseShader);
        const meshMaterial = new ExtendedShaderMaterial(meshShader);
        const mesh = new Mesh(geometry, meshMaterial);
        mesh.name = 'Terrain Mesh';

        // instanced cubes
        const instancePointsMaterial = new ExtendedShaderMaterial(BinnedPointsMixin(meshShader));
        instancePointsMaterial.defines.BINNED_POINTS = 1;
        instancePointsMaterial.binnedPointsScale = 0.1;

        const instanceGeometry = new InstancedBufferGeometry();
        const boxGeom = new BoxGeometry();
        instanceGeometry.name = 'Terrain Instanced Buffer Geometry';
        instanceGeometry.attributes = boxGeom.attributes;
        instanceGeometry.index = boxGeom.index;

        const instancedMesh = new Mesh(instanceGeometry, instancePointsMaterial);
        instancedMesh.frustumCulled = false;

        // points
        const pointsMat = new ExtendedShaderMaterial(
            PointsShaderMixin(Shaders.WorldUnitsPointsShader),
        );
        pointsMat.alphaTest = 0.5;
        pointsMat.size = 0.025;
        const points = new Points(mesh.geometry, pointsMat);
        points.name = 'Terrain Points';

        super([points, mesh, instancedMesh]);

        this.renderMode = RenderMode.MESH;
    }

    /* Public */
    /**
     * Must be called when the geometry changes or data affecting dynamic geometry has changed.
     */
    update(): void {
        const geometry = this.mesh.geometry;
        this.updateGeometry(geometry);
        this._updateInstanceGeometry();

        geometry.boundingBox = null;
        geometry.boundingSphere = null;
    }

    /**
     * Overrideable function called when dynamic geometry msut be updated.
     * @param terrain 
     */
    updateGeometry(_terrain: BufferGeometry) { }

    private _updateInstanceGeometry() {
        // Create new attributes here because three.js requires that for resizing arrays.
        const instanceGeometry = this.instancedPoints.geometry;
        const geometry = this.mesh.geometry;
        const attrs = geometry.attributes;
        for (const name in attrs) {
            const instName = `instance_${name}`;
            const attr = geometry.getAttribute(name) as any;
            let instAttr: any = instanceGeometry.getAttribute(instName);

            if (!instAttr || instAttr.count !== attr.count) {
                instAttr = new InstancedBufferAttribute(new Float32Array(), 0);
                instAttr.name = instName;
                instAttr.itemSize = attr.itemSize;
                instAttr.normalized = attr.normalized;
                instAttr.usage = attr.usage;
                instAttr.meshPerAttribute = 1;
                instAttr.count = attr.count;
                instAttr.array = attr.array;
            } else {
                instAttr.array = attr.array;
                instAttr.needsUpdate = true;
            }

            instanceGeometry.setAttribute(instName, instAttr);
        }
    }
}
