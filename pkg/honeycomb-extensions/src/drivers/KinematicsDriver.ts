import { Driver, StateDiff, isRobot } from '@gov.nasa.jpl.honeycomb/core';
import { KinematicState, ROBOT_INIITIAL, RobotState } from '@gov.nasa.jpl.honeycomb/telemetry-animator';

import type { Object3D } from 'three';

function getObjectState(obj: Object3D): RobotState {
    const out: RobotState = {
        x: obj.position.x,
        y: obj.position.y,
        z: obj.position.z,
        qx: obj.quaternion.x,
        qy: obj.quaternion.y,
        qz: obj.quaternion.z,
        qw: obj.quaternion.w
    };

    if (isRobot(obj)) {
        for (const [name, joint] of Object.entries(obj.joints)) {
            out[name] = joint.jointValue[0] as number;
        }
    }

    return out;
}

function handleNaNOrUndefined(value: number, def: number) {
    if (Number.isNaN(value)) {
        return def;
    }

    return value ?? def;
}

export function applyStateVector(obj: Object3D, state: Partial<RobotState>) {
    const frameState = {
        ...ROBOT_INIITIAL,
        ...state
    };

    // Update position
    obj.position.x = handleNaNOrUndefined(frameState.x, 0);
    obj.position.y = handleNaNOrUndefined(frameState.y, 0);
    obj.position.z = handleNaNOrUndefined(frameState.z, 0);
    obj.quaternion.w = handleNaNOrUndefined(frameState.qw, 0);
    obj.quaternion.x = handleNaNOrUndefined(frameState.qx, 0);
    obj.quaternion.y = handleNaNOrUndefined(frameState.qy, 0);
    obj.quaternion.z = handleNaNOrUndefined(frameState.qz, 1);

    // An unnormalized quaternion warps the model
    obj.quaternion.normalize();

    if (isRobot(obj)) {
        const robot = obj;

        // Update URDF joints
        const jointValues = { ...frameState } as Partial<RobotState>;
        delete jointValues.x;
        delete jointValues.y;
        delete jointValues.z;
        delete jointValues.qw;
        delete jointValues.qx;
        delete jointValues.qy;
        delete jointValues.qz;
        for (const [joint, value] of Object.entries(jointValues)) {
            if (value !== undefined && robot.joints[joint] !== undefined) {
                robot.setJointValue(joint, handleNaNOrUndefined(value, 0));
            }
        }
    }

    obj.updateMatrix();
    obj.updateMatrixWorld();
}

export class KinematicsDriver extends Driver<{ kinematics: KinematicState }> {
    private initialStates = new Map<string, RobotState>();
    private lastUpdateFinished = false;

    update(fullState: { kinematics: KinematicState }, diff: StateDiff<{ kinematics: KinematicState }>): void {
        if (!diff.didChange("kinematics") && this.lastUpdateFinished) {
            return;
        }

        const viewer = this.viewer!;

        const state = fullState.kinematics ?? {};
        this.lastUpdateFinished = true;

        // Update the robot kinematics
        for (const [frameName, frameStatePartial] of Object.entries(state)) {
            const frame = viewer.objects[frameName];
            if (frame) {
                if (!this.initialStates.has(frameName)) {
                    this.initialStates.set(frameName, getObjectState(frame));
                }

                applyStateVector(frame, frameStatePartial);
            } else {
                this.lastUpdateFinished = false;
            }
        }

        for (const [name, initializedState] of this.initialStates) {
            if (!state[name] && viewer.objects[name]) {
                applyStateVector(viewer.objects[name], initializedState);
                this.initialStates.delete(name);
            }
        }
    }
}
