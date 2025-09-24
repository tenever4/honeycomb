import { TelemetryAnimator } from "./TelemetryAnimator";

export interface RobotState {
    x: number;
    y: number;
    z: number;
    qx: number;
    qy: number;
    qz: number;
    qw: number;
    [joint: string]: number;
}

export const ROBOT_INIITIAL: RobotState = {
    x: 0, y: 0, z: 0,
    qx: 0, qy: 0, qz: 0, qw: 1
};

export interface KinematicState {
    [robotName: string]: RobotState;
}

export interface KinematicsAnimator extends TelemetryAnimator<KinematicState> {

}
/**
 * Maps the annotation IDs to their current data
 * (options are constant in time and therefore passed directly to the driver)
 */
export type AnnotationState = Record<string, object | null>;

export interface AnnotationsAnimator extends TelemetryAnimator<AnnotationState> {

}

export interface FullState {
    kinematics: KinematicState;
    annotations: AnnotationState;
}

