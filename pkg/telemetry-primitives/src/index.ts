import { AnnotationMixin, MeshAnnotation, Annotation } from './base/Annotation';

// shapes
import { ShapeAnnotation } from './shapes/ShapeAnnotation';
import { BoxAnnotation } from './shapes/BoxAnnotation';
import { CylinderAnnotation, EllipticCylinderAnnotation } from './shapes/CylinderAnnotation';
import { InstancedCylinderAnnotation, InstancedEllipticCylinderAnnotation } from './shapes/InstancedCylinderAnnotation';
import { FrustumAnnotation, type CameraFrustrumOptions } from './shapes/FrustumAnnotation';
import { LinearFrustumAnnotation } from './shapes/LinearFrustumAnnotation';
import { HexagonAnnotation } from './shapes/HexagonAnnotation';
import { SphereAnnotation, SpheroidAnnotation } from './shapes/SphereAnnotation';
import { TriangleAnnotation } from './shapes/TriangleAnnotation';
import { StadiumAnnotation } from './shapes/StadiumAnnotation';

// lines
import { LineAnnotation } from './lineShapes/LineAnnotation';
import { CircleLineAnnotation, EllipseLineAnnotation } from './lineShapes/CircleLineAnnotation';
import { SquareLineAnnotation } from './lineShapes/SquareLineAnnotation';
import { TriangleLineAnnotation } from './lineShapes/TriangleLineAnnotation';
import { StadiumLineAnnotation } from './lineShapes/StadiumLineAnnotation';

// wrappers
import { StencilShape } from './wrappers/StencilShape';
import { StampShape } from './wrappers/StampShape';

// mixins
import { type LabeledMesh, LabeledMixin } from './mixins/LabeledMixin';

// objects
import {
    RectangleKeepZone,
    CircleKeepZone,
    TriangleKeepZone,
    FrustumStamp,
} from './objects/KeepZoneShapes';
import {
    SphereFence,
    BoxFence,
    CylinderFence,
    TriangleFence,
    HexagonFence,
} from './objects/FenceShapes';
import { LabeledVertex } from './objects/LabeledVertex';
import { WedgePlane } from './objects/WedgePlane';

export { AnnotationMixin, MeshAnnotation, Annotation };

// shapes
export {
    ShapeAnnotation,
    BoxAnnotation,
    CylinderAnnotation,
    EllipticCylinderAnnotation,
    InstancedCylinderAnnotation,
    InstancedEllipticCylinderAnnotation,
    FrustumAnnotation,
    type CameraFrustrumOptions,
    LinearFrustumAnnotation,
    HexagonAnnotation,
    SphereAnnotation,
    SpheroidAnnotation,
    TriangleAnnotation,
    StadiumAnnotation,
};

// lines
export {
    LineAnnotation,
    CircleLineAnnotation,
    EllipseLineAnnotation,
    SquareLineAnnotation,
    TriangleLineAnnotation,
    StadiumLineAnnotation,
};

// wrappers
export { StencilShape, StampShape };

// other
export {
    RectangleKeepZone,
    CircleKeepZone,
    TriangleKeepZone,
    FrustumStamp,
    SphereFence,
    BoxFence,
    CylinderFence,
    TriangleFence,
    HexagonFence,
    type LabeledMesh,
    LabeledMixin,
    LabeledVertex,
    WedgePlane,
};
