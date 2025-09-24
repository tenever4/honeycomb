import { Frame, StateBase } from '@gov.nasa.jpl.honeycomb/common';
import { ObjectCache } from '@gov.nasa.jpl.honeycomb/object-cache';

import { TelemetryAnimator } from './TelemetryAnimator';
import { copyOnTo } from './utils';

// TODO: See if these can be generated on another thread like a webworker.
// TODO: See how the tfTracker and transforms are working with this considering
// some data may not have the up-to-date frame data that it needs.
export interface KeyframeAnimator<T extends StateBase> {
    keyframes: ObjectCache<number | null, T>;

    /**
     * Iterate over all frames and generate keyframes every `keyframeStride`
     * milliseconds. Returns a promise that resolves when the keyframes have
     * been fully generated.
     *
     * @returns {Promise}
     */
    generateKeyframes(): Promise<void>;
    getKeyframe(time: number): Promise<T> | T | undefined;
    resolveToNextKeyframeTime(time: number): number;
}

type GConstructor<T> = new (...args: any[]) => T;

/**
 * Mixin function that produces a new class that inherits from base and mixes
 * in {@link #KeyframeAnimator KeyframeAnimator}. Base class is expected to
 * derive from {@link #TelemetryAnimator TelemetryAnimator}.
 * @function
 * @param {class} base
 *
 * @fires keyframe-progress
 * Fired whenever a new keyframe has been created when generating keyframes.
 */
export function KeyframeAnimatorMixin<T extends StateBase, TBase extends GConstructor<TelemetryAnimator<T>>>(Base: TBase) {
    /**
     * Mixin class used for generating keyframes up front using an ObjectCache and
     * reading those keyframes as the time is scrubbed to avoid having to iterate
     * over all prior frames. Used for cases when all telemetry data must be progressively
     * read from disk on demand because it's too much to read into memory.
     * @class KeyframeAnimator
     */
    return class KeyframeAnimatorMixin extends Base implements KeyframeAnimator<T> {
        isKeyframeAnimator = true;

        /**
         * The time relative to the datas time scale between generated keyframes.
         * @memberof KeyframeAnimator
         * @member {Number}
         * @default 5
         */
        keyframeStride: number = 5;

        /**
         * Whether or not keyframes are actively being generated.
         * @memberof KeyframeAnimator
         * @member {Boolean}
         */
        generatingKeyframes: boolean = false;

        /**
         * The time in milliseconds that keyframes have been generated up to.
         * @memberof KeyframeAnimator
         * @member {Number}
         */
        generatedKeyframesUpTo: number = -1;

        keyframes: ObjectCache<number | null, T>;

        private _lastKeyframe: T;
        private _lastKeyframeTime: number | null = null;
        private _keyframeUpdateNeeded: boolean;
        private _pendingKeyframeTime?: number;
        private _pendingKeyframe?: Promise<T>;
        private _keyframeLoadId: number;

        constructor(...args: any) {
            super(...args);

            this.keyframes = new ObjectCache();
            this._lastKeyframe = {} as T;
            this._keyframeUpdateNeeded = false;
            this._keyframeLoadId = 0;
        }

        /**
         * Iterate over all frames and generate keyframes every `keyframeStride`
         * milliseconds. Returns a promise that resolves when the keyframes have
         * been fully generated.
         *
         * @returns {Promise}
         */
        async generateKeyframes(): Promise<void> {
            if (this._disposed) {
                return;
            }

            if (this.generatingKeyframes) {
                throw new Error('KeyframeAnimator: Already generating keyframes.');
            }

            let lastTime: number | null = null;
            const lastKeyframe = {} as T;
            this.generatingKeyframes = true;

            const promises: Promise<void>[] = [];
            await this.forEachFrame(
                (state, time) => {
                    if (lastTime === null) {
                        lastTime = this.resolveToNextKeyframeTime(time);
                    }

                    const newTime = this.resolveToNextKeyframeTime(time);
                    if (lastTime !== newTime) {
                        const copied = {} as T;
                        copyOnTo(lastKeyframe, copied, !!this.traverseArrays);
                        promises.push(this._setKeyFrame(lastTime, copied));

                        // If the current time falls within the bounds of this key frame and next
                        // then reset and update the time.
                        if (this._resolveToKeyframeTime(this.time) === lastTime) {
                            const currState = {};
                            copyOnTo(this.state, currState, !!this.traverseArrays, false, false);
                            copyOnTo(copied, this.state, !!this.traverseArrays, false, false);
                            copyOnTo(currState, this.state, !!this.traverseArrays, false, false);

                            this.dispatchEvent({ type: 'change', time: this.time, state: this.state });
                        }

                        lastTime = newTime;
                    }

                    this.mergeStateForKeyframes(state, lastKeyframe);
                    this.generatedKeyframesUpTo = time;
                    this._debouncer.run('generating-keyframes', () => this.dispatchEvent({ type: 'keyframe-progress' }));

                },
                { raw: true },
            );
            await Promise.all(promises);
            this.generatingKeyframes = false;

            this._debouncer.run('generating-keyframes', () => this.dispatchEvent({ type: 'keyframe-progress' }));

            if (lastKeyframe) {
                this._lastKeyframeTime = lastTime;
                this._lastKeyframe = lastKeyframe;
            }
        }

        mergeStateForKeyframes(from: T, to: T): T {
            return this.mergeState(from, to);
        }

        getKeyframe(time: number) {
            if (!this.keyframes) {
                return;
            }

            const keyframeTime = this._resolveToKeyframeTime(time);
            if (this._pendingKeyframeTime === keyframeTime) {
                return this._pendingKeyframe;
            }

            const keyframe = this.keyframes.get(keyframeTime);
            this._pendingKeyframe = keyframe;
            this._pendingKeyframeTime = keyframeTime;
            return keyframe;
        }

        async addFrames(newFrames: Frame<T>[]) {
            super.addFrames(newFrames);

            if (this.generatingKeyframes) {
                throw new Error('KeyframeAnimator: Cannot add new frames while keyframes are being generated.');
            }

            const promises: Promise<void>[] = [];
            for (let i = 0, l = newFrames.length; i < l; i++) {
                const frame = newFrames[i];
                const time = frame.time;
                const state = frame.state;

                const keyframeTime = this.resolveToNextKeyframeTime(time);
                if (this._lastKeyframeTime !== keyframeTime) {
                    const copied = {} as T;
                    copyOnTo(this._lastKeyframe, copied, !!this.traverseArrays);
                    promises.push(this._setKeyFrame(this._lastKeyframeTime, copied));
                    this._lastKeyframeTime = keyframeTime;
                    this._lastKeyframe = {} as T;
                }

                this.mergeState(state, this._lastKeyframe);
                this.generatedKeyframesUpTo = time;
            }

            await Promise.all(promises);
        }

        dispose() {
            super.dispose();
            this.keyframes.clear();
        }

        async _step(delta: number) {
            if (this._keyframeUpdateNeeded && this.keyframes) {
                const targetTime = this.time + delta;
                const keyframeTime = this._resolveToKeyframeTime(targetTime);

                // if another keyframe request has already started loading
                this._keyframeLoadId++;
                const workingId = this._keyframeLoadId;
                const keyframe = await this.getKeyframe(targetTime);
                if (this._keyframeLoadId !== workingId) return;

                if (keyframe) {
                    copyOnTo(keyframe, this._steppedState, !!this.traverseArrays);
                    copyOnTo(keyframe, this.state, !!this.traverseArrays);
                }
                this.time = keyframeTime;
                this._keyframeUpdateNeeded = false;

                delta = targetTime - this.time;
                this.dispatchEvent({ type: 'change', time: this.time, state: this.state });
            }

            return super._step(delta);
        }

        _reset() {
            this._keyframeUpdateNeeded = true;
            return super._reset();
        }

        _resolveToKeyframeTime(time: number) {
            return Math.trunc(time / this.keyframeStride) * this.keyframeStride;
        }

        resolveToNextKeyframeTime(time: number) {
            return this._resolveToKeyframeTime(time) + this.keyframeStride;
        }

        async _setKeyFrame(time: number | null, state: T) {
            const keyframes = this.keyframes;
            try {
                await keyframes.set(time, state);
            } catch (_) {
                console.warn(
                    `KeyframeAnimator: Keyframe at time "${time}" already exists. Skipping.`,
                );
            }
        }
    };
}
