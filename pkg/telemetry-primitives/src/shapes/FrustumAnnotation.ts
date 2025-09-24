import { Ray, Vector3, BoxGeometry, Material, Vector2 } from 'three';
import { getRay } from '@gov.nasa.jpl.honeycomb/cahvore-utilities';
import { ShapeAnnotation } from './ShapeAnnotation';
import { type CameraDefinition } from '@gov.nasa.jpl.honeycomb/camera-loader';

export type CameraFrustrumOptions = CameraDefinition & {
    /**
     * the distance between the camera model and the near plane
     */
    nearDist: number;

    /**
     * the distance between the camera model and the far plane
     */
    farDist: number;

    /**
     * the number of segments to create along the x axis (all sides)
     */
    widthSegments: number;

    /**
     * the number of segments to create along the y axis (all sides)
     */
    heightSegments: number;
};


/*
 * Update the positions in a frustum based on the parameters by calling the CAHV or CAHVORE conversion methods.
 * It is required for the x and y values of the positions to be between [0, 1] to convert into image space.
 * options from createFrustumGeometry
 * positions the flat array of positions we are modifying
 */
function updateFrustumPositions(options: CameraFrustrumOptions, positions: any) {
    const position = new Vector3();
    const tempRay = new Ray();
    const tempOrigin = new Vector3();

    // if projectEnds is true then the near and far distances for the rays
    // are projected onto the near and far planes
    const projectDirection = options.A.clone().normalize();
    const projectEnds = false;

    for (let i = 0, l = positions.count; i < l; i++) {
        // get the x and y locations of the current vertex
        position.fromBufferAttribute(positions, i);

        // convert them into image space
        // This is why the range must be between [0, 1]
        position.x = position.x * options.width;
        position.y = position.y * options.height;

        getRay(options, new Vector2(position.x, position.y), tempRay);

        // convert the projection array to a point on the near or far plane
        if (projectEnds) {
            const zSign = position.z < 0;
            tempRay.direction.normalize();
            tempRay.direction.multiplyScalar(1 / tempRay.direction.dot(projectDirection));
            tempOrigin.copy(tempRay.origin).addScaledVector(tempRay.direction, zSign ? options.nearDist : options.farDist);
        } else {
            tempRay.at(position.z < 0 ? options.nearDist : options.farDist, tempOrigin);
        }

        // set the position
        positions.setXYZ(i, tempOrigin.x, tempOrigin.y, tempOrigin.z);
    }
}

/*
 * Create the geometry for the frustum. Takes CAHVOREOptions.
 */
function createFrustumGeometry(options: CameraFrustrumOptions) {
    const geom = new BoxGeometry(1, 1, 1, options.widthSegments, options.heightSegments, 1);
    geom.translate(0.5, 0.5, 0);

    const positions = geom.getAttribute('position');
    updateFrustumPositions(options, positions);

    geom.setAttribute('position', positions);
    geom.computeVertexNormals();
    return geom;
}

/**
 * Frustum for depicting the view volume of a camera.
 * This will be transformed using CAHV or CAHVORE settings.
 * @extends Mesh
 */
export class FrustumAnnotation extends ShapeAnnotation {
    name = 'FrustumAnnotation';

    constructor(material?: Material);
    constructor(parameters: CameraDefinition | CameraFrustrumOptions, material?: Material);

    constructor(...args: [
        /**
         * An instance of material derived from the {@link THREE.MaterialMaterial} base class or an array of materials, defining the object's appearance.
         */
        material?: Material
    ] | [
        parameters: CameraDefinition | CameraFrustrumOptions,
        /**
         * An instance of material derived from the {@link THREE.MaterialMaterial} base class or an array of materials, defining the object's appearance.
         */
        material?: Material
    ]) {
        super();

        let material;
        if (args[0] && !(args[0] instanceof Material)) {
            this.setParameters(args[0]);
            material = args[1];
        } else {
            material = args[0];
        }

        this.material = material ?? this.material;
    }

    /**
     * Update the parameters of the CAHVORE frustum geometry.
     * @param {CameraFrustrumOptions} parameters
     */
    setParameters(parameters: CameraDefinition | CameraFrustrumOptions) {
        const defaultedParams: CameraFrustrumOptions = {
            nearDist: 0.085,
            farDist: 10.0,
            widthSegments: 16,
            heightSegments: 16,
            ...parameters,
        };

        this.geometry.dispose();
        this.geometry = createFrustumGeometry(defaultedParams);
    }

    copy(source: this) {
        super.copy(source);
        this.geometry.copy(source.geometry);
        return this;
    }
}
