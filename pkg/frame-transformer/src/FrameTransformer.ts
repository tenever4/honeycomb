import { Matrix4, Quaternion, Vector3, Vector4 } from 'three';

const _mat = new Matrix4();

const _quat = new Quaternion();
const _quat2 = new Quaternion();

const tempPos = new Vector3();
const tempSca = new Vector3();
const vec4 = new Vector4();

// A set of utility functions for transforming vectors, rotations, and matrices
// between frames.
// "fromFrame" and "toFrame" are of type Matrix4
/**
 * Class with static methods for transforming between frames
 */
class FrameTransformer {
    /**
     * Transforms the provided input matrix from being relative to the `fromFrame` to being
     * relative to the `toFrame`. The result is written to the `output` matrix. The input and
     * output matrices _can_ be the same object.
     * @param {Matrix4} fromFrame
     * @param {Matrix4} toFrame
     * @param {Matrix4} mat
     * @param {Matrix4} outputMat
     */
    static transformFrame(fromFrame: Matrix4, toFrame: Matrix4, mat: Matrix4, outputMat: Matrix4) {
        // referencing Object3D.attach()
        _mat.copy(toFrame).invert();

        _mat.multiply(fromFrame);

        outputMat.copy(mat);
        outputMat.premultiply(_mat);
    }

    /**
     * Same as `transformFrame` but for points.
     * @param {Matrix4} fromFrame
     * @param {Matrix4} toFrame
     * @param {Vector3} pos
     * @param {Vector3} outputVec
     */
    static transformPoint(fromFrame: Matrix4, toFrame: Matrix4, pos: Vector3, outputVec: Vector3) {
        _mat.copy(toFrame).invert();

        outputVec.copy(pos);
        outputVec.applyMatrix4(fromFrame);
        outputVec.applyMatrix4(_mat);
    }

    /**
     * Same as `transformFrame` but for directions.
     * @param {Matrix4} fromFrame
     * @param {Matrix4} toFrame
     * @param {Vector3} dir
     * @param {Vector3} outputVec
     */
    static transformDirection(fromFrame: Matrix4, toFrame: Matrix4, dir: Vector3, outputVec: Vector3) {
        _mat.copy(toFrame).invert();

        vec4.set(dir.x, dir.y, dir.z, 0);
        vec4.w = 0;
        vec4.applyMatrix4(fromFrame);
        vec4.applyMatrix4(_mat);

        outputVec.set(vec4.x, vec4.y, vec4.z);
    }

    /**
     * Same as `transformFrame` but for quaternions.
     * @param {Matrix4} fromFrame
     * @param {Matrix4} toFrame
     * @param {Quaternion} quat
     * @param {Quaternion} outputQuat
     */
    static transformQuaternion(fromFrame: Matrix4, toFrame: Matrix4, quat: Quaternion, outputQuat: Quaternion) {
        fromFrame.decompose(tempPos, _quat, tempSca);
        toFrame.decompose(tempPos, _quat2, tempSca);

        // https://github.com/mrdoob/three.js/pull/20243
        outputQuat.copy(quat);
        outputQuat.premultiply(_quat);
        outputQuat.premultiply(_quat2.invert());
    }

    private _from: Matrix4;
    private _to: Matrix4;

    /**
     * The `FrameTransformer` can be instantiated such that it will _only_ transform between a fixed set
     * of frames. The instance retains the same static methods but they only take the `input` and the
     * `output` parameters.
     *
     * Note that a reference to the passed matrices are saved so updates to them will effect results.
     * @param {Matrix4} fromFrame
     * @param {Matrix4} toFrame
     */
    constructor(fromFrame: Matrix4, toFrame: Matrix4) {
        this._from = fromFrame;
        this._to = toFrame;
    }

    /**
     * @param {Matrix4} mat
     * @param {Matrix4} output
     */
    transformMatrix(mat: Matrix4, output: Matrix4) {
        FrameTransformer.transformFrame(this._from, this._to, mat, output);
    }

    /**
     * @param {Vector3} pos
     * @param {Vector3} output
     */
    transformPoint(pos: Vector3, output: Vector3) {
        FrameTransformer.transformPoint(this._from, this._to, pos, output);
    }

    /**
     * @param {Vector3} dir
     * @param {Vector3} output
     */
    transformDirection(dir: Vector3, output: Vector3) {
        FrameTransformer.transformDirection(this._from, this._to, dir, output);
    }

    /**
     * @param {Quaternion} quat
     * @param {Quaternion} output
     */
    transformQuaternion(quat: Quaternion, output: Quaternion) {
        FrameTransformer.transformQuaternion(this._from, this._to, quat, output);
    }
}

export { FrameTransformer };
