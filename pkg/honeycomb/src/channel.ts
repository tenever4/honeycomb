import { Object3D } from "three";

export enum OrientationConvention {
    rpy,            // roll, pitch, yaw
    hamilton,       //!< W,X,Y,Z
    jpl,            //!< X,Y,Z,W
}

export enum ChannelType {
    constant,
    animated
}

export interface Channel<T> {
    type: ChannelType;

    /**
     * Only used for kinematic (numeric) channels
     */
    interpolate: boolean;

    /**
     * When {@link type} is {@link ChannelType.constant}, this is the raw constant value
     * When {@link type} is {@link ChannelType.animated}, this is the default channel value when there is no data
     */
    value: T;

    /**
     * When {@link type} is {@link ChannelType.animated} this corresponds to a field (column) in the data query
     * If this is undefined, its 
     */
    field?: string;

    /**
     * When {@link type} is {@link ChannelType.animated} this allows us to explicitly use a different
     * channel for the time field.
     */
    useSeparateTimeChannel?: boolean;
    timeChannel?: Channel<number>;
};

export type KinematicChannel = Channel<number>;

export interface Position {
    x: KinematicChannel;
    y: KinematicChannel;
    z: KinematicChannel;
}

export interface Orientation {
    type: OrientationConvention;
    x: KinematicChannel; // roll (or x)
    y: KinematicChannel; // pitch (or y)
    z: KinematicChannel; // yaw (or z)
    w: KinematicChannel; // not used in rpy
}

export interface Pose {
    /**
     * Origin point in parent's frame
     */
    position: [x: number, y: number, z: number];

    /**
     * Orientation in parent's frame
     * Always XYZW
     */
    orientation: [x: number, y: number, z: number, w: number];
}

/**
 * If this is a URDF robot, the joints will also show here
 */
export type Joints = Record<string, KinematicChannel>;


export interface Annotation<Data, Options> extends Object3D {
    /**
     * Update the annotation object from a new set of options
     * Mark viewer.dirty 
     * @param options Options to update
     */
    options(options: Partial<Options>): void;

    /**
     * Update the 
     * @param data 
     */
    update(data: Data): void;
}
