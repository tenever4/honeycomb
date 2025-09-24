export type TypedArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array;


export function isTypedArray(array: TypedArray | unknown) {
    return (
        array instanceof Float32Array ||
        array instanceof Float64Array ||
        array instanceof Uint8Array ||
        array instanceof Uint8ClampedArray ||
        array instanceof Int8Array ||
        array instanceof Uint16Array ||
        array instanceof Int16Array ||
        array instanceof Uint32Array ||
        array instanceof Int32Array
    );
}

export function isFloatArray(array: TypedArray) {
    return array instanceof Float32Array || array instanceof Float64Array;
}

export function isIntArray(array: TypedArray) {
    return isTypedArray(array) && !isFloatArray(array);
}

export function isSignedArray(array: TypedArray) {
    return array instanceof Int8Array || array instanceof Int16Array || array instanceof Int32Array;
}

export function getArrayMinMax(array: TypedArray) {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0, l = array.length; i < l; i++) {
        const value = array[i];
        min = value < min ? value : min;
        max = value > max ? value : max;
    }

    return { min, max };
}


/**
 * Represents a type which can release resources, such
 * as event listening or a timer.
 */
export interface Disposable {
    /**
     * Dispose this resource
     */
    dispose: () => void;
}

export function mergeDisposables(...disps: (Disposable | undefined | null)[]): Disposable {
    return {
        dispose: () => {
            for (const disp of disps) {
                disp?.dispose();
            }
        }
    };
}
