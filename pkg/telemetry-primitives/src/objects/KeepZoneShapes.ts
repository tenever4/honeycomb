import {
    MeshBasicMaterial,
    KeepStencilOp,
    NotEqualStencilFunc,
    BackSide,
    CustomBlending,
    ZeroStencilOp,
    Color,
    Vector2,
    Vector3,
} from 'three';
import { BoxAnnotation } from '../shapes/BoxAnnotation';
import { CylinderAnnotation } from '../shapes/CylinderAnnotation';
import { TriangleAnnotation } from '../shapes/TriangleAnnotation';
import { type CameraFrustrumOptions, FrustumAnnotation } from '../shapes/FrustumAnnotation';

import { StampShape } from '../wrappers/StampShape';
import type { CameraDefinition } from '@gov.nasa.jpl.honeycomb/camera-loader';

// Use custom blending and transparent = false to ensure enable blending
// but ensure that the transparent draw happens in the same draw group
// sort as the opaque objects.
const MaterialOptions = {
    transparent: false,
    opacity: 0.15,
    blending: CustomBlending,
    depthTest: false,
    depthWrite: false,

    side: BackSide,
    stencilWrite: true,
    stencilFunc: NotEqualStencilFunc,
    stencilRef: 0,
    stencilFail: KeepStencilOp,
    stencilZFail: KeepStencilOp,
    stencilZPass: ZeroStencilOp,
};

const MATERIALS: Record<string, MeshBasicMaterial> = {
    KIZ: new MeshBasicMaterial({
        ...MaterialOptions,
        color: new Color(0x4CAF50).convertSRGBToLinear(),
    }),
    KOZ: new MeshBasicMaterial({
        ...MaterialOptions,
        color: new Color(0xE91E63).convertSRGBToLinear(),
    }),
};

function getMaterial(color: keyof typeof MATERIALS  ) {
    if (!(color in MATERIALS)) {
        MATERIALS[color] = new MeshBasicMaterial({ ...MaterialOptions, color });
    }

    return MATERIALS[color];
}

class RectangleKeepZone extends StampShape<BoxAnnotation> {
    constructor(width: number, height: number, keepIn?: boolean) {
        super(
            new BoxAnnotation(keepIn ? MATERIALS.KIZ : MATERIALS.KOZ)
        );

        this.shape.size.set(width, height, 100);
        this.setRenderOrder(keepIn ? -1 : -2);
    }

    setSize(width: number, height: number) {
        this.shape.size.set(width, height, 100);
    }
}

class CircleKeepZone extends StampShape<CylinderAnnotation> {
    constructor(radius: number, keepIn?: boolean) {
        super(
            new CylinderAnnotation(keepIn ? MATERIALS.KIZ : MATERIALS.KOZ)
        );

        this.shape.radius = radius;
        this.shape.length = 100;
        this.setRenderOrder(keepIn ? -1 : -2);
    }

    setRadius(radius: number) {
        this.shape.radius = radius;
    }
}

class TriangleKeepZone extends StampShape<TriangleAnnotation> {
    constructor(p1: Vector2 | Vector3, p2: Vector2 | Vector3, p3: Vector2 | Vector3, keepIn?: boolean) {
        super(
            new TriangleAnnotation(keepIn ? MATERIALS.KIZ : MATERIALS.KOZ)
        );

        this.shape.setVertices(p1, p2, p3);
        this.shape.length = 100;
        this.setRenderOrder(keepIn ? -1 : -2);
    }

    setPoints(p1: Vector2 | Vector3, p2: Vector2 | Vector3, p3: Vector2 | Vector3) {
        this.shape.setVertices(p1, p2, p3);
    }
}

class FrustumStamp extends StampShape<FrustumAnnotation> {
    constructor(options: CameraDefinition | CameraFrustrumOptions, color: string) {
        super(
            new FrustumAnnotation(getMaterial(color))
        );
        this.setRenderOrder(-1);
        this.shape.setParameters(options);
    }
}

export { RectangleKeepZone, CircleKeepZone, TriangleKeepZone, FrustumStamp };
