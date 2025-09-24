import { Vector3 } from "three";

/**
 * Set of extended math utility functions.
 */
export class ExtMathUtils {
    /**
     * Takes a set of points and derives a best fit plane from them. Puts the plane origin
     * in targetPos and the direction in targetDir.
     * @param {Array<Vector3>} points
     * @param {Vector3} targetPos
     * @param {Vector3} targetDir
     * @returns {void}
     */
    static fitPlaneFromPoints(points: Array<Vector3>, targetPos: Vector3, targetDir: Vector3): void {
        // plane fit to points
        // https://www.ilikebigbits.com/2015_03_04_plane_from_points.html
        targetPos.set(0, 0, 0);
        targetDir.set(0, 0, 0);

        // get the average point
        for (let i = 0, l = points.length; i < l; i++) {
            targetPos.add(points[i]);
        }
        targetPos.multiplyScalar(1 / points.length);

        let xx = 0;
        let xy = 0;
        let xz = 0;
        let yy = 0;
        let yz = 0;
        let zz = 0;
        for (let i = 0; i < points.length; i ++) {
            const v = points[i];
            v.sub(targetPos);

            xx += v.x * v.x;
            xy += v.x * v.y;
            xz += v.x * v.z;
            yy += v.y * v.y;
            yz += v.y * v.z;
            zz += v.z * v.z;

            v.add(targetPos);
        }

        const detX = yy*zz - yz*yz;
        const detY = xx*zz - xz*xz;
        const detZ = xx*yy - xy*xy;
        const detMax = Math.max(detX, detY, detZ);
        if (detMax < 0) {
            throw new Error();
        }

        if (detMax === detX) {
            targetDir.x = detX;
            targetDir.y = xz*yz - xy*zz;
            targetDir.z = xy*yz - xz*yy;
        } else if (detMax === detY) {
            targetDir.x = xz*yz - xy*zz;
            targetDir.y = detY;
            targetDir.z = xy*xz - yz*xx;
        } else if(detMax === detZ) {
            targetDir.x = xy*yz - xz*yy;
            targetDir.y = xy*xz - yz*xx;
            targetDir.z = detZ;
        }

        targetDir.normalize();
    }
}
