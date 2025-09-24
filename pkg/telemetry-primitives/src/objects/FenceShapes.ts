import { ShaderLib, DoubleSide, Mesh } from 'three';

import { BoxAnnotation } from '../shapes/BoxAnnotation';
import { CylinderAnnotation } from '../shapes/CylinderAnnotation';
import { HexagonAnnotation } from '../shapes/HexagonAnnotation';
import { SphereAnnotation } from '../shapes/SphereAnnotation';
import { TriangleAnnotation } from '../shapes/TriangleAnnotation';

import { Mixins, getMaterialClass } from '@gov.nasa.jpl.honeycomb/mixin-shaders';
const { FenceFromHeightMixin } = Mixins;

const FENCE_MATERIAL = getMaterialClass(FenceFromHeightMixin(ShaderLib.phong));
type Constructor = new (...args: any[]) => Mesh;
export function FenceMixin<TBase extends Constructor>(base: TBase) {
    return class extends base {
        constructor(...args: any) {
            super(...args);
            this.material = new FENCE_MATERIAL({
                side: DoubleSide,
                transparent: true,
                opacity: 0.5,
                shininess: 1,
                flatShading: true,
                depthWrite: false,
            });
        }
    };
}

export const SphereFence = FenceMixin(SphereAnnotation);
export const BoxFence = FenceMixin(BoxAnnotation);
export const CylinderFence = FenceMixin(CylinderAnnotation);
export const TriangleFence = FenceMixin(TriangleAnnotation);
export const HexagonFence = FenceMixin(HexagonAnnotation);
