import { Frame, StateBase } from '@gov.nasa.jpl.honeycomb/common';
import { NestedTelemetryAnimator } from './NestedTelemetryAnimator';

export type CustomAnimatorInterpolateCallback<T extends StateBase, K extends keyof T> = (
    current: T[K],
    next: T[K],
    ratio: number,
    target: T[K],
    interpolateStateCb: <S extends T[K]>(currState: S, nextState: S, ratio: number, target: S) => S
) => T[K];

export type CustomAnimatorMergeCallback<T extends StateBase, K extends keyof T> = (
    from: T[K],
    to: T[K],
    mergeState: <S extends T[K]>(from: S, to: S) => S
) => T[K];

export interface CustomTelemetryAnimatorOptions<T extends StateBase> {
    interpolateMap?: Record<keyof T, CustomAnimatorInterpolateCallback<T, keyof T>>;
    mergeMap?: Record<string, CustomAnimatorMergeCallback<T, keyof T>>;
}

/**
 * Provides means for creating an animator with custom merge and interpolate
 * functions for different sub objects.
 *
 * @extends NestedTelemetryAnimator
 */
class CustomTelemetryAnimator<T extends StateBase> extends NestedTelemetryAnimator<T> {
    isCustomTelemetryAnimator: boolean;
    options: CustomTelemetryAnimatorOptions<T>;

    /**
     * Options object can take a value for {@link #CustomTelemetryAnimator#interpolateMap interpolateMap} and {@link #CustomTelemetryAnimator#mergeMap}.
     */
    constructor(frames?: Frame<T>[]) {
        super(frames);
        this.reset();
        this.options = {};
        this.isCustomTelemetryAnimator = true;
    }

    interpolateState<S extends T | T[keyof T]>(currState: S, nextState: S, ratio: number, target: S, interpolateMap = this.options.interpolateMap) {
        if (typeof currState === 'object') {
            for (const name in currState) {
                const func = interpolateMap && interpolateMap[name];
                if (func) {
                    if (typeof func === 'function') {
                        target[name] = func(
                            currState[name],
                            nextState[name],
                            ratio,
                            target[name],
                            super.interpolateState,
                        );
                    } else {
                        target[name] = super.interpolateState(
                            currState[name],
                            nextState[name],
                            ratio,
                            target[name],
                        );
                    }
                } else {
                    target[name] = this.interpolateState(
                        currState[name] as any,
                        nextState[name],
                        ratio,
                        target[name],
                        func,
                    );
                }
            }
            return target;
        } else {
            return super.interpolateState(currState, nextState, ratio, target);
        }
    }

    mergeState<S extends T | T[keyof T]>(from: S, to: S, mergeMap = this.options.mergeMap) {
        if (typeof from === 'object') {
            for (const name in from) {
                if (!to[name]) {
                    if (Array.isArray(from[name])) {
                        to[name] = [];
                    } else if (typeof from[name] === 'object' && from[name]) {
                        to[name] = {};
                    } else {
                        to[name] = from[name];
                    }
                }

                const func = mergeMap && mergeMap[name];
                if (func) {
                    if (typeof func === 'function') {
                        to[name] = func(from[name], to[name], super.mergeState);
                    } else {
                        to[name] = this.mergeState(from[name], to[name], func);
                    }
                } else {
                    to[name] = super.mergeState(from[name], to[name]);
                }
            }
            return to;
        } else {
            return from;
        }
    }
}

export { CustomTelemetryAnimator };
