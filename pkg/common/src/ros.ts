interface RosVector3 {
    x: number;
    y: number;
    z: number;
}

interface RosQuaternion {
    x: number;
    y: number;
    z: number;
    w: number;
}

interface RosTransform {
    translation: RosVector3;
    rotation: RosQuaternion;
}

/**
 * Timestamp as reported from a ROS node. In some libraries it's reported as "sec"
 * in others it's repoted as "secs". Only only version is expected on the object.
 *
 * Normally sec and nsec are used (which rosbagjs reports) while secs and nsecs are reported when using python...
 */
interface CppTimeStamp {
    sec: number;
    nsec: number;
}

interface PythonTimeStamp {
    secs: number;
    nsecs: number;
}

export type TimeStamp = CppTimeStamp | PythonTimeStamp;

/**
 * Standard metadata for higher-level stamped data types.
 * This is generally used to communicate timestamped data
 * in a particular coordinate frame.
 */
export interface Header {
    /**
     * Sequence ID: consecutively increasing ID
     */
    seq: number;

    /**
     * Two-integer timestamp that is expressed as:
     * stamp.sec: seconds (stamp_secs) since epoch (in Python the variable is called 'secs')
     * stamp.nsec: nanoseconds since stamp_secs (in Python the variable is called 'nsecs')
     * time-handling sugar is provided by the client library
     */
    stamp: TimeStamp;

    /**
     * Frame this data is associated with
     */
    frame_id: string;
}

export enum PointCloudFieldDataType {
    INT8 = 1,
    UINT8 = 2,
    INT16 = 3,
    UINT16 = 4,
    INT32 = 5,
    UINT32 = 6,
    FLOAT32 = 7,
    FLOAT64 = 8,
}

/**
 * This message holds the description of one point entry in the
 * PointCloud2 message format.
 */
export interface PointCloudField {
    /**
     * Name of the field
     */
    name: string;

    /**
     * Offset from start of point struct
     */
    offset: number;

    /**
     * Datatype enumeration
     */
    datatype: PointCloudFieldDataType;

    /**
     * How many elements in the field
     */
    count: number;
}

/**
 * This message holds a collection of N-dimensional points, which may
 * contain additional information such as normals, intensity, etc. The
 * point data is stored as a binary blob, its layout described by the
 * contents of the "fields" array.
 * 
 * The point cloud data may be organized 2d (image-like) or 1d
 * (unordered). Point clouds organized as 2d images may be produced by
 * camera depth sensors such as stereo or time-of-flight.
 * 
 * Time of sensor data acquisition, and the coordinate frame ID (for 3d
 * points).
 */
export interface PointCloud2 {
    header: Header;

    /**
     * Is this data bigendian?
     */
    is_bigendian: boolean;

    /**
     * 2D structure of the point cloud. If the cloud is unordered, height is
     * 1 and width is the length of the point cloud.
     */
    height: number;
    width: number;

    /**
     * Describes the channels and their layout in the binary data blob.
     */
    fields: PointCloudField[];

    /**
     * Length of point in bytes
     */
    point_step: number;

    /**
     * Length of a row in bytes
     */
    row_step: number;

    /**
     * Actual point data, size is (row_step*height)
     */
    data: Uint8Array;

    /**
     * True if there are no invalid points
     */
    is_dense: boolean;
}

/**
 *  # This expresses a transform from coordinate frame header.frame_id
 * to the coordinate frame child_frame_id
 *
 * This message is mostly used by the
 * tf package.
 * See its documentation for more information.
 */
export interface TransformStamped {
    header: Header;

    /**
     * the frame id of the child frame
     */
    child_frame_id: string;
    transform: RosTransform;
}

/**
 * ROS Topic message streamed out on "/tf", "/tf_static"
 */
export interface TfMessage {
    transforms: TransformStamped[];
}
