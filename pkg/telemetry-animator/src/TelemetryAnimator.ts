import {
    lerp,
    rollUpState,
    optimizeFrames,
    copyOnTo,
    binarySearchFindFrame,
} from './utils';

import { Debouncer } from '@gov.nasa.jpl.honeycomb/scheduling-utilities';
import { EventDispatcher, type HoneycombEvent } from '@gov.nasa.jpl.honeycomb/event-dispatcher';
import type { Frame, StateBase } from '@gov.nasa.jpl.honeycomb/common';

export interface TelemetryAnimatorForEachFrame {
    startTime?: number;
    endTime?: number;
    raw?: boolean
}

/**
 * Class that manages and can step through a set of frames over time.
 * @extends EventDispatcher
 *
 * @fires added-frames
 * Fired when new frames are added to the animator.
 *
 * @fires change
 * Fired when the rolled up state has changed.
 *
 * @fires reset
 * Fired when the animator has been reset.
 *
 * @fires dispose
 * Fired when the animator has been disposed.
 */
export class TelemetryAnimator<T extends StateBase> extends EventDispatcher {
    /**
     * Whether or not this animator can be rewound. Set this to false if
     * using a websocket and frames are being streamed in using
     * {@link #TelemetryAnimator#addFrames .addFrames}. If false old data
     * behind the playhead will be discarded.
     *
     * !> Note that if the playhead is not kept at the latest frame using
     * {@link #TelemetryAnimator#setTime .setTime} then frames could be
     * accumulated using addFrames and overrun available memory.
     */
    seekable: boolean = true;

    /**
     * The duration of frames to retain when seekable === false.
     */
    nonSeekableBuffer: number = 0;

    /**
     * A field indicating that the data provided by the animator is coming
     * in live, such as through a websocket. This doesn't change the
     * behavior of the class and is just an informative flag.
     */
    liveData: boolean = false;

    /**
     * Indicates whether there is an active live connection with the incoming
     * data-stream. This creates an indicator on the Honeycomb viewer
     */
    connected: boolean = false;

    /**
     * If true indicates that data can be interpolated and if the time is set
     * to before the start time of the frames the initial frame data is
     * assumed to be set before frame 0.
     */
    continuous: boolean = false;

    /**
     * If `true` then the values in returned state are interpolated when the
     * current time lands in between frames.
     */
    interpolate: boolean = false;

    /**
     * By default arrays in states are copied when being merging states
     * rather than merging objects within the array. Setting this field to
     * true enables copying and deep merging objects within the array.
     */
    traverseArrays: boolean = false;

    /**
     * If `true` indicates that the current data is out of date and waiting
     * on something to be up to date. This flag can be set by derivative
     * animators that dynamically fetch data from the server or preprocess
     * data and may not be ready immediately especially when jumping ahead.
     */
    stale: boolean = false;

    /**
     * The array of frames the animator will iterate over.
     */
    frames: Frame<T>[];

    /**
     * The current time the animator has iterated up to and that state is
     * set to.
     */
    time: number = 0;

    /**
     * The last state stepped to. If interpolation = true then this
     * will included interpolation.
     */
    state: T;

    /**
     * Used for Animators that require promised fetching.
     * The UI will note their loading status before data is requested
     */
    loading: boolean = false;
    wasLoading: boolean = false;

    protected _currFrame: number;
    protected _startTime: number;
    protected _endTime: number;
    protected _disposed: boolean;
    protected _steppedState: T;

    protected _debouncer: Debouncer;
    protected _suppressChangeEvent: boolean;

    readonly isTelemetryAnimator: boolean = true;

    /**
     * Returns whether or not frames are available to be animated.
     */
    get ready() {
        return this.frames.length > 0;
    }

    get disposed() {
        return this._disposed;
    }

    /**
     * The beginning time for the frames.
     */
    get startTime() {
        return Math.min(
            this._startTime,
            (this.frames && this.frames[0] && this.frames[0].time) || 0.0,
        );
    }

    /**
     * The end time for the frames.
     * @member {Number}
     */
    get endTime() {
        return Math.max(
            this._endTime,
            (this.frames &&
                this.frames[this.frames.length - 1] &&
                this.frames[this.frames.length - 1].time) ||
            0.0,
        );
    }

    constructor(frames?: Frame<T>[]) {
        super();
        this.frames = frames ?? [];

        this.state = {} as T;
        this._steppedState = {} as T;

        this._currFrame = -1;

        this._startTime = Infinity;
        this._endTime = -Infinity;

        this._debouncer = new Debouncer();
        this._suppressChangeEvent = false;
        this._disposed = false;

        this.reset();
    }

    /* Public Functions */
    /**
     * Set the time to track the animator up to. Frames will be iterated over to
     * the given time and merged using the {@link #TelemetryAnimator#mergeState mergeState} function. If the given time is between frames and
     * {@link #TelemetryAnimator#interpolate interpolate} is true, then the
     * {@link #TelemetryAnimator#interpolateState interpolateState} function
     * will be used to interpolate the data.
     *
     * The resultant state will be set on {@link #TelemetryAnimator#state state} and the current time on {@link #TelemetryAnimator#time time}.
     */
    async setTime(time: number): Promise<void> {
        if (this._disposed) {
            return;
        }

        if (time >= this.time) {
            await this._step(time - this.time);
        } else {
            this._reset();
            await this._step(time - this.time);
        }
    }

    /**
     * Performs a binary search to find the frame at the given time. Returns the
     * frame (which should not be modified) that occurs on or right before the
     * given time. If `nextTime` is `true` then the frame after the given time
     * is returned.
     */
    findFrameAtTime(time: number, nextFrame = false): Frame<T> | null {
        const frames = this.frames;
        const v = binarySearchFindFrame(frames, time);
        if (v === -1) {
            return null;
        } else {
            return (nextFrame ? frames[v + 1] : frames[v]) ?? null;
        }
    }

    /**
     * Returns the time of the next frame after the current
     * {@link #TelemetryAnimator#time time} that the animator is at.
     */
    getNextSignificantTime(): number | null {
        const frames = this.frames;
        const currFrame = this._currFrame;
        const nextFrame = currFrame + 1;

        const frame = frames[nextFrame];
        if (frame) {
            return frame.time;
        } else {
            return null;
        }
    }

    /**
     * Returns the time of the previous frame before the current
     * {@link #TelemetryAnimator#time time} that the animator is at.
     */
    getPrevSignificantTime(): number | null {
        const time = this.time;
        const frames = this.frames;
        const currFrame = this._currFrame;
        const prevFrame = currFrame - 1;

        let frame;
        frame = frames[currFrame];
        if (frame && frame.time === time) {
            frame = frames[prevFrame];
        }

        if (frame) {
            return frame.time;
        } else {
            return null;
        }
    }

    /**
     * Resets the animation to time 0. This is called every time the time is
     * reversed in order to re-roll up all frames to the new time. Returns a
     * promise when the animator has finished resetting in case setting the time
     * requires asynchronous loading.
     *
     * @returns {Promise}
     */
    async reset(): Promise<void> {
        if (this._disposed) {
            return;
        }

        this._reset();
        this._step(0);
    }

    /**
     * Iterates over and calls `cb` for every frame in the data set. By default
     * every frame is iterated over and merged. If the callback returns "true"
     * then the iteration ends early. The set of options available options are:
     *
     * ```js
     * {
     *      // If true then an unmerged frame state will be provided
     *      raw = false : boolean,
     *
     *      // The time bounds over which to iterate. Defaults to all frames
     *      startTime : number,
     *      endTime : number
     * }
     * ```
     *
     * Returns a promise that resolves when all frames have been iterated over
     * in the case that frames need to be loaded and processed asynchronously.
     */
    forEachFrame(cb: (state: T, time: number) => void, options?: TelemetryAnimatorForEachFrame) {
        if (this._disposed) {
            return;
        }

        return new Promise<void>(resolve => {
            const startTime = options?.startTime ?? -Infinity;
            const endTime = options?.endTime ?? Infinity;
            const raw = options?.raw ?? false;

            const frames = this.frames;
            const state: T = {} as T;
            for (let i = 0, l = frames.length; i < l; i++) {
                const frame = frames[i];
                const time = frame.time;
                let _state: T | null = null;
                if (raw) {
                    _state = frame.state;
                } else {
                    this.mergeState(frame.state, state);
                    _state = state;
                }

                if (time > startTime && time < endTime && _state !== null) {
                    cb(_state, time);
                }
            }
            resolve();
        });
    }

    /**
     * Look back through all available frames that are currently loaded. Stops
     * when "true" is returned from the callback or all data is iterated over.
     * Raw, unmerged frame state data is passed into the callback
     */
    seekBack(cb: (state: T, time: number) => boolean, fromTime?: number) {
        if (this._disposed) {
            return;
        }

        const frames = this.frames;
        let startFrame = this._currFrame;
        if (fromTime !== undefined) {
            startFrame = binarySearchFindFrame(frames, fromTime);
            if (startFrame === -1) {
                return;
            }
        }

        for (let i = startFrame; i >= 0; i--) {
            const frame = frames[i];
            const state = frame.state;
            const time = frame.time;

            if (cb(state, time)) {
                break;
            }
        }
    }

    /**
     * Merges any frames that describe the same point in time to minimize the
     * amount of frames stored and iterated over.
     *
     * @returns {void}
     */
    optimize(): void {
        this.frames = optimizeFrames(this.frames, (from, to) => this.mergeState(from, to));
        this._currFrame = - 1;
        this.setTime(this.time);
    }

    /**
     * Sorts the frames by the time field.
     *
     * @returns {void}
     */
    sort(): void {
        if (this.frames) {
            this.frames.sort((a, b) => a.time - b.time);
        }
    }

    /**
     * Appends the given frames to the list of loaded frames. It is assumed that
     * these frames are already sorted and come _after_ the set of already
     * loaded frames.
     */
    addFrames(newFrames: Frame<T>[]) {
        if (this._disposed) {
            return;
        }

        if (this.frames === null) {
            this.frames = [];
        }

        if (newFrames.length) {
            const frames = this.frames;
            for (const frame of newFrames) {
                frames.push(frame);
            }
            this.dispatchEvent({ type: 'added-frames', frames: newFrames });

            if (newFrames[newFrames.length - 1].time < this.time) {
                this.setTime(this.time);
            }
        }
    }

    /**
     * Marks the animator as disposed so any async tasks can cancel and not
     * resolve.
     */
    dispose() {
        this.dispatchEvent({ type: 'dispose' });
        super.dispose();

        this._disposed = true;

        this._debouncer.cancelAll();
        this._debouncer.run = function () { throw new Error("Debouncer disposed"); };
    }

    dispatchEvent(e: HoneycombEvent) {
        if (this._disposed) {
            return;
        }

        super.dispatchEvent(e);
    }

    /* Private Functions */
    protected _reset() {
        if (!this.seekable) {
            return;
        }
        this.time = 0;
        this._currFrame = -1;
        this.state = {} as T;
        this._steppedState = {} as T;

        this.dispatchEvent({ type: 'reset' });
    }

    // can optionally returns a promise
    protected _step(deltaTime: number): Promise<void> | void {
        if (!this.frames || this.frames.length === 0) { return; }

        const frames = this.frames;
        this.time += deltaTime;

        const upToTime = this.time;
        const state = this.state;
        const steppedState = this._steppedState;
        if (upToTime >= this.startTime) {
            this._currFrame = rollUpState(frames, this._currFrame, upToTime, s => {
                return this.mergeState(s, steppedState);
            });

            copyOnTo(steppedState, state, !!this.traverseArrays);
        } else if (this.continuous) {
            copyOnTo(frames[0].state, state);
        }

        if (
            this.continuous &&
            this.interpolate &&
            this._currFrame + 1 < frames.length &&
            this._currFrame !== -1
        ) {
            const currF = frames[this._currFrame];
            const nextF = frames[this._currFrame + 1];
            const delta = nextF.time - currF.time;
            const ratio = (this.time - currF.time) / delta;

            const nextState = {} as T;
            copyOnTo(state, nextState, !!this.traverseArrays);
            rollUpState(frames, this._currFrame, nextF.time, s => {
                this.mergeState(s, nextState);
            });

            this.interpolateState(steppedState, nextState, ratio, state);
        }

        // TODO: Only dispatch the change event when interpolating or a
        // frame actually moves forward.
        // if (this._currFrame !== prevCurrFrame || interpolated) {
        //     this.dispatchEvent({ type: 'change', time: this.time, state });
        // }
        this.dispatchUpdate();

        if (!this.seekable) {
            this._trimFrames(this.time - this.nonSeekableBuffer);
        }
    }

    /**
     * Manually trigger a 'change' event to trigger Honeycomb to redraw the
     * state by passing it to the animators.
     */
    dispatchUpdate() {
        if (!this._suppressChangeEvent) {
            this.dispatchEvent({ type: 'change', time: this.time, state: this.state });
        }
    }

    _trimFrames(time = this.time) {
        const frames = this.frames;
        let count = 0;
        while (frames.length && frames[0].time < time) {
            const frame = frames.shift();

            if (frame) {
                this._startTime = Math.min(frame.time, this._startTime);
                this._endTime = Math.min(frame.time, this._endTime);
                count++;
            }
        }
        this._currFrame -= count;
    }

    /* Interface */
    /**
     * The function that is called to interpolate a state object. The
     * interpolated values are expected to be placed on the `target` object.
     * `currState` and `nextState` are to not be modified. The target object (or
     * a replacement for it) is expected to be returned.
     *
     * Intended to be overriden by derivative classes. By default only shallow
     * fields are interpolated.
     */
    interpolateState(currState: T, nextState: T, ratio: number, target: T): void {
        for (const name in nextState) {
            const nextVal = nextState[name];
            if (name in currState && typeof nextVal === 'number') {
                target[name] = lerp(currState[name], nextVal, ratio) as any;
            }
        }
    }

    /**
     * The function that is called to merge states when iterating over frames.
     * The fields from `from` are expected to be copied or moved onto `to`.
     *
     * Intended to be overriden by derivative classes. By default only shallow
     * fields are moved onto `to`.
     * 
     * @param from State to copy from
     * @param to State to copy to
     * @returns to
     */
    mergeState(from: T, to: T): T {
        // using a for in loop is faster than using Object.assign
        for (const name in from) { to[name] = from[name]; }

        return to;
    }
}
