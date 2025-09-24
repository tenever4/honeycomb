import type { CancellablePromise } from '@gov.nasa.jpl.honeycomb/scheduling-utilities';
import { TelemetryAnimator, type TelemetryAnimatorForEachFrame } from './TelemetryAnimator';
import { rollUpState, copyOnTo } from './utils';
import type { Frame, StateBase } from '@gov.nasa.jpl.honeycomb/common';
import { CancellationToken, CancellationTokenSource } from '@gov.nasa.jpl.honeycomb/scheduling-utilities/src/cancellation';

// TODO: Add a job system or something requests and be easily triaged and picked up
// so unneeded jobs can be cancelled. This should happen at the file-read level, though,
// which may mean the returned promise should include a "cancel" function that will stop
// and reject the promise.
export class BufferChunk<T extends StateBase> {
    frames?: Frame<T>[];
    length: number;
    needsUpdate: boolean;

    promise?: CancellablePromise<Frame<T>[]>;

    constructor(readonly time: number, chunkSize: number, promise: CancellablePromise<Frame<T>[]>) {
        if (time % chunkSize !== 0) {
            throw new Error(`Time must be a function of chunk size ${chunkSize}`);
        }

        this.length = chunkSize;
        this.needsUpdate = false;
        this.promise = promise;
        this.promise.then(frames => {
            this.frames = frames;
            this.promise = undefined;
        });
    }
}

type GConstructor<T extends StateBase> = new (...args: any[]) => TelemetryAnimator<T>;

export interface BufferedAnimator<T extends StateBase> extends TelemetryAnimator<T> {
    /**
     * Request buffering of frames around a specified point in time
     */
    getFrames?: (time: number, length: number) => Promise<Frame<T>[]>;

    resetChunkAtTime(time: number): void;
    resolveToChunkTime(time: number): number;
}

/**
 * Mixin function that produces a new class that inherits from base and mixes
 * in {@link #BufferedAnimator BufferedAnimator}. Base class is expected to
 * derive from {@link #TelemetryAnimator TelemetryAnimator}.
 */
export function BufferedAnimatorMixin<T extends StateBase, TBase extends GConstructor<T>>(base: TBase) {
    /**
     * Mixin class used for dynamically reading frames from disk or fetching them
     * in chunks via a custom `getFrames` implementation. Use if the full set of
     * frame data cannot be loaded at once.
     * @class BufferedAnimator
     */
    return class extends base {

        isBufferedAnimator: boolean = true;

        chunkSize: number;
        buffer: number;

        private _awaiting: boolean;
        private _currChunk: number;
        private _actualTime: number;
        private _workingId: number;
        private _knownEndTime: number;

        bufferedFrames: BufferChunk<T>[] = [];

        set startTime(val) {
            this._startTime = val;
        }

        get startTime() {
            return this._startTime === Infinity ? 0 : this._startTime;
        }

        set endTime(val) {
            this._endTime = val;
        }

        get endTime() {
            return this._endTime === -Infinity ? 0 : this._endTime;
        }

        /**
         * Returns whether or not frames we currently being loaded.
         * @member {Boolean}
         */
        // @ts-expect-error Overriding property with getter
        get loading() {
            return !!this._awaiting;
        }

        set loading(s: boolean) {
            this._awaiting = s;
        }

        /**
         * The function used to read new frame data. Must return a promise that
         * resolves with all frames within the provided time range.
         * @param time Starting time to get frame for
         * @param length Length of time to request frame chunks on
         * @param token Cancellation token to stop the request early
         */
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        getFrames(time: number, length: number, token: CancellationToken): PromiseLike<Frame<T>[]> {
            throw new Error('getFrames() not implemented: ');
        }

        /**
         * Frames array is not taken because it is read as needed.
         */
        constructor(...args: any[]) {
            super(...args);

            /**
             * The size of a "chunk" of frames or the amount of frames
             * to load at once relative to the datas time scale
             * @member {Number}
             * @memberof BufferedAnimator
             * @default 1
             */
            this.chunkSize = 1;

            /**
             * The buffer amount relative to the datas time scale before and
             * after the current time to load.
             * @member {Number}
             * @memberof BufferedAnimator
             * @default 5
             */
            this.buffer = 5;

            this._awaiting = false;
            this._actualTime = -1;
            this._workingId = -1;
            this._currChunk = -1;

            this._startTime = Infinity;
            this._endTime = -Infinity;
            this._knownEndTime = Infinity;

            requestAnimationFrame(() => {
                this.reset();
            });
        }

        /**
         * The function used to read new frame data. Must return a promise that
         * resolves with all frames within the provided time range.
         * @param time Starting time to get frame for
         * @param length Length of time to request frame chunks on
         */
        private _getFrames(time: number, length: number): CancellablePromise<Frame<T>[]> {
            const source = new CancellationTokenSource();
            const promise = this.getFrames(time, length, source.token);
            return {
                then: promise.then.bind(promise),
                cancel: () => source.cancel()
            };
        }

        async setTime(time: number) {
            if (this._disposed) {
                return;
            }

            const delta = time - this.time;
            if (time < this.time || delta > this.buffer) {
                this._reset();
            }

            await this._step(time - this.time);
        }

        findFrameAtTime = () => { throw new Error('Not Implemented'); };

        getNextSignificantTime() {
            // return the current time if we're not on a specific chunk yet
            const currChunk = this._currChunk;
            if (currChunk === -1) {
                return this.time;
            }

            const currFrame = this._currFrame;
            const chunks = this.bufferedFrames;
            const chunk = chunks[currChunk];
            const frames = chunk.frames;

            // don't jump anywhere if we haven't loaded frames yet
            if (!frames) {
                return null;
            }

            const nextFrame = currFrame + 1;
            const frame = frames[nextFrame];

            let result: number | null = null;
            if (!frame) {
                const nextChunk = currChunk + 1;
                if (!chunks[nextChunk]) {
                    // if there's no next chunk then we've reached the end of the data
                    return null;
                } else {
                    // if there's a next chunk and frames return the first frame data otherwise the beginning of the chunk
                    const nextChunkFrames = chunks[nextChunk].frames;
                    if (!nextChunkFrames || nextChunkFrames.length === 0) {
                        result = chunks[nextChunk].time;
                    } else {
                        result = nextChunkFrames[0].time;
                    }
                }
            } else {
                // return the next frame time if we have one
                result = frame.time;
            }

            return this._knownEndTime <= result ? null : result;
        }

        getPrevSignificantTime() {
            // return the current time if we're not on a specific chunk yet
            const currChunk = this._currChunk;
            if (currChunk === -1) {
                return this.time;
            }

            const time = this.time;
            const currFrame = this._currFrame;
            const chunks = this.bufferedFrames;
            const chunk = chunks[currChunk];
            const frames = chunk.frames;

            // don't jump anywhere if we haven't loaded frames yet
            if (!frames) {
                return null;
            }

            const prevFrame = currFrame - 1;
            let frame = frames[currFrame];
            if (frame && frame.time === time) {
                frame = frames[prevFrame];
            }

            let result: number | null = null;
            if (!frame) {
                const prevChunk = currChunk - 1;
                if (!chunks[prevChunk]) {
                    // if there's no next chunk then we've reached the end of the data
                    return null;
                } else {
                    // if there's a next chunk and frames return the first frame data otherwise the end of the chunk
                    const prevChunkFrames = chunks[prevChunk].frames;
                    if (!prevChunkFrames || prevChunkFrames.length === 0) {
                        result = chunks[prevChunk].time + this.chunkSize;
                    } else {
                        result = prevChunkFrames[prevChunkFrames.length - 1].time;
                    }
                }
            } else {
                // return the next frame time if we have one
                result = frame.time;
            }

            return this.startTime >= result ? null : result;
        }

        async reset() {
            if (this._disposed) {
                return;
            }

            this._reset();
            await this._step(0);
        }

        // TODO: Can we read files asynchronously here so we can queue up
        // the next frames that we'll have to iterate over?
        async forEachFrame(cb: (state: T, time: number) => void, options?: TelemetryAnimatorForEachFrame) {
            if (this._disposed) {
                return;
            }

            const localRequest = new CancellationTokenSource();

            const startTime = options?.startTime ?? this._startTime;
            const endTime = options?.endTime ?? this._endTime;
            const raw = options?.raw ?? false;
            const chunkSize = this.chunkSize;

            const state = {} as T;
            let currTime = this.resolveToChunkTime(startTime);
            while (currTime < endTime) {
                if (this._disposed) {
                    return;
                }

                const frames = await this.getFrames(currTime, chunkSize, localRequest.token);

                if (this._disposed) {
                    return;
                }

                if (frames === null) break;

                for (const frame of frames) {
                    const time = frame.time;
                    let _state: T;
                    if (raw) {
                        _state = frame.state;
                    } else {
                        this.mergeState(frame.state, state);
                        _state = state;
                    }

                    if (time > startTime && time < endTime) {
                        cb(_state, time);
                    }
                }

                currTime += chunkSize;
            }

            localRequest.dispose();
        }

        seekBack(cb: (state: T, time: number) => boolean, fromTime?: number) {
            if (this._disposed) {
                return;
            }

            if (fromTime !== undefined) {
                throw new Error('BufferedAnimatorMixin: seekBack with fromTime not implemented.');
            }

            const chunks = this.bufferedFrames;
            let currFrame = this._currFrame;
            chunkLoop: for (let i = this._currChunk; i >= 0; i--) {
                const chunk = chunks[i];
                const frames = chunk.frames;
                if (frames === undefined) {
                    break;
                }

                if (currFrame === -1) {
                    currFrame = frames.length - 1;
                }

                for (let j = currFrame; j >= 0; j--) {
                    const frame = frames[j];
                    const time = frame.time;
                    const state = frame.state;
                    if (cb(state, time)) {
                        break chunkLoop;
                    }
                }
                currFrame = -1;
            }
        }

        resetChunkAtTime(time: number) {
            const index = this._timeToChunkIndex(time);
            if (index >= 0 && index < this.bufferedFrames.length) {
                this.bufferedFrames[index].needsUpdate = true;
            }
        }

        /* Private Functions */
        protected async _step(delta: number) {
            if (this._disposed) {
                return;
            }

            // return because we're not fully initialized, yet
            if (this.buffer === undefined || !this.getFrames) return;

            this.time += delta;
            if (this._actualTime === -1) {
                // TODO: This looks back 1 buffer stride but it would be best
                // if it fetched data all the way back to / up to the last keyframe
                // if keyframes are being used. How do we support that?
                // Or at least we should prioritize the chunks that fill in the gaps
                // up to a keyframe before the chunks beforehand.
                this._actualTime = Math.max(this.time - this.buffer, this.startTime);
            }

            this._workingId++;
            const workingId = this._workingId;
            const targetTime = this.time;

            this.stale = true;

            // immediately trim the chunks so they're within the buffer bounds before loading more
            this._cleanUpChunks();
            this._fetchChunksUpTo(targetTime + this.buffer);

            const frames = this.bufferedFrames;
            const startIndex = frames.length === 0 ? 0 : this._timeToChunkIndex(this._actualTime);
            const endIndex =
                frames.length === 0
                    ? Math.trunc((targetTime - this._actualTime) / this.chunkSize)
                    : this._timeToChunkIndex(targetTime);

            let awaitedNewData = false;
            for (let i = startIndex; i <= endIndex; i++) {
                const chunk = this.bufferedFrames[i];
                if (!chunk) {
                    break;
                }

                if (this._disposed) {
                    return;
                }

                if (chunk.promise) {
                    // if we had to await new data then that means the data would
                    // have been updated.
                    awaitedNewData = true;
                    await chunk.promise;
                }

                if (this._disposed) {
                    return;
                }

                if (this._workingId !== workingId) {
                    return;
                }

                if (chunk.frames === undefined) {
                    break;
                }

                if (this._currChunk !== i) {
                    this._currFrame = -1;
                    this._currChunk = i;
                }

                this._currFrame = rollUpState(chunk.frames, this._currFrame, targetTime, s => {
                    return this.mergeState(s, this._steppedState);
                });
                copyOnTo(this._steppedState, this.state, !!this.traverseArrays);

                this._actualTime = Math.min(targetTime, chunk.time + chunk.length);

                this.dispatchEvent({ type: 'progress' });
            }

            const currChunk = this.bufferedFrames[this._currChunk];
            if (
                this.continuous &&
                this.interpolate &&
                this._currFrame !== -1 &&
                this._currFrame + 1 < currChunk.frames!.length
            ) {
                const chunkFrames = currChunk.frames!;
                const currF = chunkFrames[this._currFrame];
                const nextF = chunkFrames[this._currFrame + 1];
                const delta = nextF.time - currF.time;
                const ratio = (this.time - currF.time) / delta;

                const steppedState = this._steppedState;
                const state = this.state;
                const nextState = {} as T;
                copyOnTo(state, nextState, !!this.traverseArrays);

                // TODO(tumbar) Look at this again
                rollUpState(currChunk.frames!, this._currFrame, nextF.time, s => {
                    this.mergeState(s, nextState);
                });

                this.interpolateState(steppedState, nextState, ratio, state);
            }

            // clean up the chunks again
            this._cleanUpChunks();
            this.stale = false;

            if (!this._suppressChangeEvent && (awaitedNewData || delta !== 0)) {
                this.dispatchEvent({ type: 'change', time: this.time, state: this.state });
            }
        }

        protected _reset() {
            super._reset();
            this._actualTime = -1;
            this._currChunk = -1;
        }

        _fetchChunksUpTo(time: number) {
            // TODO: Retain a global job system that can be used to cancel running loads if they're no
            // longer needed.
            time = Math.min(this._knownEndTime, time);

            const frames = this.bufferedFrames;

            // Sometimes the cleanup of this.frames prior to calling _fetchChunksUpTo()
            // doesn't actually do a good job of cleaning up, particularly when the actual
            // time is before the chunk time of the first element of this.frames. The
            // following simple fix appears to resolve this issue while still passing all
            // of the unit tests. See:
            // - https://github.jpl.nasa.gov/Honeycomb/honeycomb/pull/1768
            // - https://github.jpl.nasa.gov/Honeycomb/honeycomb/pull/1758
            const actualChunkTime = this.resolveToChunkTime(this._actualTime);
            if (frames.length && frames[0].time > actualChunkTime) {
                frames.forEach(chunk => {
                    if (chunk.promise && chunk.promise.cancel) {
                        chunk.promise.cancel();
                    }
                });
                this.bufferedFrames = [];
            }

            const startIndex = frames.length === 0 ? 0 : this._timeToChunkIndex(frames[0].time);
            const endIndex =
                frames.length === 0
                    ? Math.trunc((time - this._actualTime) / this.chunkSize)
                    : this._timeToChunkIndex(time);

            for (let i = startIndex; i <= endIndex; i++) {
                if (!frames[i] || frames[i].needsUpdate) {
                    const time =
                        frames.length === 0
                            ? this.resolveToChunkTime(this._actualTime)
                            : this._indexToChunkTime(i);
                    const chunk = new BufferChunk(time, this.chunkSize, this._getFrames(time, this.chunkSize));
                    chunk.promise?.then(frames => {
                        if (frames && frames.length !== 0) {
                            const startFrame = frames[0];
                            const endFrame = frames[frames.length - 1];

                            const startTime = startFrame.time;
                            const endTime = endFrame.time;

                            this._startTime = Math.min(startTime, this._startTime);
                            this._endTime = Math.max(endTime, this._endTime);
                        } else if (frames === undefined) {
                            if (this._endTime === -Infinity) {
                                this._knownEndTime = Math.min(
                                    time,
                                    this._knownEndTime
                                );
                            } else {
                                this._knownEndTime = Math.min(
                                    this._endTime,
                                    time,
                                    this._knownEndTime
                                );
                            }
                        }
                    });
                    frames[i] = chunk;
                }
            }
        }

        resolveToChunkTime(time: number): number {
            return Math.trunc(time / this.chunkSize) * this.chunkSize;
        }

        _indexToChunkTime(index: number) {
            const firstChunk = this.bufferedFrames[0];
            return firstChunk.time + this.chunkSize * index;
        }

        _timeToChunkIndex(time: number) {
            const firstChunk = this.bufferedFrames[0];
            if (firstChunk) {
                const deltaTime = time - firstChunk.time;
                const index = Math.trunc(deltaTime / this.chunkSize);
                return index;
            } else {
                return -1;
            }
        }

        _cleanUpChunks() {
            const earliestTime = this.resolveToChunkTime(this._actualTime - this.buffer);
            const frames = this.bufferedFrames;
            let toRemove = 0;
            for (let i = 0, l = frames.length; i < l; i++) {
                const chunk = frames[i];
                if (chunk.time < earliestTime) {
                    if (chunk.promise && chunk.promise.cancel) {
                        chunk.promise.cancel();
                    }
                    toRemove++;
                } else {
                    break;
                }
            }

            frames.splice(0, toRemove);
            this._currChunk = Math.max(this._currChunk - toRemove, -1);

            toRemove = 0;
            const latestTime = this.resolveToChunkTime(this._actualTime + this.buffer);
            for (let i = frames.length - 1; i >= 0; i--) {
                const chunk = frames[i];
                if (chunk.time > latestTime) {
                    if (chunk.promise && chunk.promise.cancel) {
                        chunk.promise.cancel();
                    }
                    toRemove++;
                } else {
                    break;
                }
            }

            frames.splice(frames.length - toRemove, toRemove);
        }
    };
}
