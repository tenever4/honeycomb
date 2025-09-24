import { Frame } from '@gov.nasa.jpl.honeycomb/common';
import { TelemetryAnimator } from './TelemetryAnimator';
import { lerp, copyOnTo } from './utils';

type StateValue = number | Record<string, NestedState> | StateValue[];
export interface NestedState {
    [state: number]: StateValue;
}


/**
 * Telemetry Animator that can handle interpolating nested objects
 *
 * @extends TelemetryAnimator
 */
export class NestedTelemetryAnimator<T extends NestedState> extends TelemetryAnimator<T> {
    isNestedTelemetryAnimator: boolean = true;

    constructor(frames?: Frame<T>[]) {
        super(frames);
        this.traverseArrays = false;
    }

    /* Interface */
    interpolateState<S extends T | T[keyof T]>(currState: S, nextState: S, ratio: number, target: S): S {
        const nextVal = nextState;
        const currVal = currState;
        const nextType = typeof nextVal;
        const currType = typeof currVal;
        const isArray = Array.isArray(currVal);

        // initialize the value in target if it doesn't exist.
        if (currType !== typeof target) {
            switch (currType) {
                case 'number':
                case 'string':
                    target = currVal;
                    break;
                case 'object':
                    target = (isArray ? [] : {}) as S;
                    break;
            }
        }

        // interpolate if possible
        if (nextType === currType && Array.isArray(currVal) === Array.isArray(nextVal)) {
            if (nextType === 'number') {
                (target as number) = lerp(currVal as number, nextVal as number, ratio);
            } else if (nextType === 'object' && ((this.traverseArrays && isArray) || !isArray)) {
                for (const name in nextState) {
                    target[name] = this.interpolateState(
                        currVal[name] as any,
                        nextVal[name],
                        ratio,
                        target[name],
                    ) as any;
                }
            }
        }

        return target;
    }

    // merge "from" object into the "to" object
    mergeState(from: T, to: T) {
        return copyOnTo(from, to, this.traverseArrays, false, false);
    }
}
