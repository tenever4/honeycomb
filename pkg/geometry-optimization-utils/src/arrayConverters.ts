import { TypedArray, isFloatArray, isSignedArray } from '@gov.nasa.jpl.honeycomb/common';

/**
 * Takes a given typed array and converts it into an array that can store data with
 * the given sign flag and byte precision. Float arrays are converted such that [0, 1.0]
 * (or [-1.0, 1.0] if signed) is normalized to the whole byte precision. Int or Uint types
 * are normal mapped to the new byte range.
 *
 * If the given array is already of the target type it is returned unchanged immediately.
 *
 * @param {TypedArray} array
 * @param {Boolean} [signed=true]
 * @param {Number} [bytes=1]
 * @returns {TypedArray}
 */
function toNormalizedByteArray(array: TypedArray, signed: boolean = true, bytes: number = 1): TypedArray {
    const isFloat = isFloatArray(array);
    let targetConstructor;
    switch (bytes) {
        case 1:
            targetConstructor = signed ? Int8Array : Uint8Array;
            break;

        case 2:
            targetConstructor = signed ? Int16Array : Uint16Array;
            break;

        case 4:
            targetConstructor = signed ? Int32Array : Uint32Array;
            break;

        default:
            throw new Error(`Cannot convert to normalized array of ${bytes} bytes.`);
    }

    if (array instanceof targetConstructor) {
        return array;
    }

    const target = new targetConstructor(array.length);
    const targetBitsPerElement = target.BYTES_PER_ELEMENT * 8;
    const targetMaxValue =
        Math.pow(2, signed ? targetBitsPerElement - 1 : targetBitsPerElement) - 1;

    if (isFloat) {
        for (let i = 0, l = array.length; i < l; i++) {
            let value = array[i];
            if (!signed && value < 0) {
                value = 0;
            }

            const targetValue = ~~(value * targetMaxValue);
            target[i] = targetValue;
        }
    } else {
        const isSigned = isSignedArray(array);
        const arrayBitsPerElement = array.BYTES_PER_ELEMENT * 8;
        const arrayMaxValue =
            Math.pow(2, isSigned ? arrayBitsPerElement - 1 : arrayBitsPerElement) - 1;

        for (let i = 0, l = array.length; i < l; i++) {
            const value = array[i];
            let normalizedValue = value / arrayMaxValue;
            if (!signed && normalizedValue < 0) {
                normalizedValue = 0;
            }

            const targetValue = ~~(normalizedValue * targetMaxValue);
            target[i] = targetValue;
        }
    }

    return target;
}

// Converts the give typed array into a float array of the given byte length
/**
 * Takes a given typed array and converts it into a float array of the given byte length with
 * normalized data.
 *
 * @param {TypedArray} array
 * @param {Number} [bytes=4]
 * @returns {TypedArray}
 */
function toFloatArray(array: TypedArray, bytes: number = 4): TypedArray {
    const isFloat = isFloatArray(array);
    const isSigned = isSignedArray(array);
    const bitsPerElement = array.BYTES_PER_ELEMENT * 8;
    const arrayMaxValue = Math.pow(2, isSigned ? bitsPerElement - 1 : bitsPerElement) - 1;

    let targetConstructor;
    switch (bytes) {
        case 4:
            targetConstructor = Float32Array;
            break;

        case 8:
            targetConstructor = Float64Array;
            break;

        default:
            throw new Error(`Cannot convert to float array of ${bytes} bytes.`);
    }
    const target = new targetConstructor(array.length);

    if (isFloat) {
        for (let i = 0, l = array.length; i < l; i++) {
            target[i] = array[i];
        }
    } else {
        for (let i = 0, l = array.length; i < l; i++) {
            const value = array[i];
            const targetValue = value / arrayMaxValue;
            target[i] = targetValue;
        }
    }

    return target;
}

export { toFloatArray, toNormalizedByteArray };
