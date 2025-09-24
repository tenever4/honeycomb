import { Frame, StateBase } from "@gov.nasa.jpl.honeycomb/common";

function lerp(start: number, end: number, ratio: number) {
    return start + (end - start) * ratio;
}

// iterates over the frames array from currFrame up until
// untilTime. Returns the last frame and calls `mergeFunc` with
// every state encountered so it can be rolled up.
function rollUpState<T extends StateBase>(frames: Frame<T>[], currFrame: number, untilTime: number, mergeFunc: (s: T) => void) {
    if (currFrame >= frames.length) return currFrame;

    while (currFrame + 1 < frames.length) {
        const nextF = frames[currFrame + 1];
        const nextS = nextF.state;

        if (nextF && untilTime >= nextF.time) {
            currFrame++;

            mergeFunc(nextS);
        } else {
            break;
        }
    }

    return currFrame;
}

function mergeFunc(next: any, target: any) {
    // using a for in loop is faster than using Object.assign
    for (const name in next) target[name] = next[name];
}

function optimizeFrames<T extends StateBase>(frames: Frame<T>[], merge = mergeFunc) {
    if (frames.length === 0) return frames;

    let currF = frames[0];
    const arr = [currF];
    for (let i = 1; i < frames.length; i++) {
        const nextF = frames[i];

        const currS = currF.state;
        const nextS = nextF.state;

        if (currF.time === nextF.time) {
            merge(nextS, currS);
        } else {
            arr.push(nextF);
            currF = nextF;
        }
    }

    return arr;
}

function isArrayBuffer(obj: any) {
    return (
        obj instanceof ArrayBuffer ||
        (!!obj &&
            typeof obj === 'object' &&
            'BYTES_PER_ELEMENT' in obj &&
            obj.buffer instanceof ArrayBuffer)
    );
}

function copyOnTo(
    from: any,
    to: any,
    traverseArrays: boolean = false,
    shallow: boolean = false,
    removeUnusedKeys: boolean = true,
    copyTypedArrays: boolean = false,
) {
    if (Array.isArray(from)) {
        if (!traverseArrays) {
            return from;
        } else if (Array.isArray(from) !== Array.isArray(to) || to === from) {
            to = [];
        }

        if (removeUnusedKeys || to.length < from.length) {
            to.length = from.length;
        }

        for (let i = 0, l = from.length; i < l; i++) {
            to[i] = copyOnTo(
                from[i],
                to[i],
                traverseArrays,
                shallow,
                removeUnusedKeys,
                copyTypedArrays,
            );
        }
        return to;
    } else if (isArrayBuffer(from)) {
        if (!copyTypedArrays) {
            return from;
        } else if (
            isArrayBuffer(from) !== isArrayBuffer(to) ||
            from.constructor !== to.constructor ||
            from.length !== to.length ||
            to === from
        ) {
            to = from.slice();
        } else {
            for (let i = 0, l = from.length; i < l; i++) {
                to[i] = from[i];
            }
        }
        return to;
    } else if (from && typeof from === 'object') {
        if (!to || typeof from !== typeof to || to === from) {
            to = {};
        }

        for (const name in from) {
            if (shallow) {
                to[name] = from[name];
            } else {
                to[name] = copyOnTo(
                    from[name],
                    to[name],
                    traverseArrays,
                    shallow,
                    removeUnusedKeys,
                    copyTypedArrays,
                );
            }
        }

        // remove unneeded fields
        if (removeUnusedKeys) {
            for (const name in to) {
                if (!(name in from)) {
                    delete to[name];
                }
            }
        }
        return to;
    } else {
        return from;
    }
}

function diffState<T>(a: T, b: T): Record<string, any> | boolean {
    if (a === b) {
        return false;
    } else if (Array.isArray(a) || Array.isArray(b) || isArrayBuffer(a) || isArrayBuffer(b)) {
        return true;
    } else if (a && typeof a === 'object' && b && typeof b === 'object') {
        const result: Record<string, any> = {};
        const skip: Record<string, boolean> = {};
        let hasValues: Record<string, any> | boolean = false;
        for (const aKey in a) {
            if (aKey in b) {
                const didChange = diffState(a[aKey], b[aKey]);
                hasValues = didChange || hasValues;
                if (didChange) {
                    result[aKey] = didChange;
                } else {
                    skip[aKey] = true;
                }
            } else {
                hasValues = true;
                result[aKey] = true;
            }
        }

        for (const bKey in b) {
            if (bKey in result || bKey in skip) {
                continue;
            } else if (bKey in a) {
                const didChange = diffState(a[bKey], b[bKey]);
                hasValues = didChange || hasValues;
                if (didChange) {
                    result[bKey] = didChange;
                } else {
                    skip[bKey] = true;
                }
            } else {
                hasValues = true;
                result[bKey] = true;
            }
        }

        return hasValues ? result : false;
    } else {
        return true;
    }
}

// https://stackoverflow.com/questions/22697936/binary-search-in-javascript
function binarySearchFindFrame(frames: Frame<any>[], time: number) {
    if (frames.length === 0 || time < frames[0].time) {
        return -1;
    } else if (time > frames[frames.length - 1].time) {
        return frames.length - 1;
    }

    let m = 0;
    let n = frames.length - 1;
    while (m <= n) {
        const k = (n + m) >> 1;
        const cmp = time - frames[k].time;
        if (cmp > 0) {
            m = k + 1;
        } else if (cmp < 0) {
            n = k - 1;
        } else {
            return k;
        }
    }

    return m - 1;
}
function binarySearch(times: number[], time: number) {
    if (time < times[0]) {
        return -1;
    } else if (time > times[times.length - 1]) {
        return times.length - 1;
    }

    let m = 0;
    let n = times.length - 1;
    while (m <= n) {
        const k = (n + m) >> 1;
        const cmp = time - times[k];
        if (cmp > 0) {
            m = k + 1;
        } else if (cmp < 0) {
            n = k - 1;
        } else {
            return k;
        }
    }

    return m - 1;
}

export {
    lerp,
    rollUpState,
    optimizeFrames,
    isArrayBuffer,
    copyOnTo,
    diffState,
    binarySearchFindFrame,
    binarySearch
};
