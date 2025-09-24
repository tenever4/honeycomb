import { HoneycombEvent } from '@gov.nasa.jpl.honeycomb/event-dispatcher';
import { ObjectCache } from '@gov.nasa.jpl.honeycomb/object-cache';
import { Debouncer } from '@gov.nasa.jpl.honeycomb/scheduling-utilities';
import { copyOnTo } from './utils';
import { TelemetryAnimator, TelemetryAnimatorForEachFrame } from './TelemetryAnimator';
import { BufferedAnimator } from './BufferedAnimatorMixin';
import { KeyframeAnimator } from './KeyframeAnimatorMixin';
import { Frame, StateBase } from '@gov.nasa.jpl.honeycomb/common';

type BufferedKeyframeAnimator<T extends StateBase> = BufferedAnimator<T> & KeyframeAnimator<T>;

/**
 * A wrapper animator that helps facilitate live data playback and caching of
 * frames for scrubbing.
 *
 * @extends TelemetryAnimator
 * @extends EventDispatcher
 */
export class LiveAnimator<
    T extends StateBase,
    S extends TelemetryAnimator<T> = TelemetryAnimator<T>,
    B extends BufferedKeyframeAnimator<T> = BufferedKeyframeAnimator<T>
> extends TelemetryAnimator<T> {
    currAnimator: TelemetryAnimator<T>;

    connectionHost: string = '';
    connectionChangeTime: Date | null = null;

    framesCache: ObjectCache<number, Frame<T>[]>;
    time: number;

    seekable = true;
    liveData = true;
    readonly isTelemetryAnimator = true;
    readonly isLiveAnimator = true;

    private _lastKeyframeState: T;
    private _lastKeyframeTime: number;

    /**
     * Takes an animator that is filled with the latest streaming data and
     * another that spools and reads data to and from disk for scrolling back
     * in time.
     * @param {TelemetryAnimator<T>} streamingAnimator
     * @param {BufferedAnimator<T>} bufferedKeyframeAnimator
     */
    constructor(readonly streamingAnimator: S, readonly cacheAnimator: B) {
        super();

        this.framesCache = new ObjectCache();
        const debouncer = new Debouncer();
        streamingAnimator.addEventListener('added-frames', e => {
            // update the keyframes from the new frame that were added
            const frames = e.frames;
            this._updateKeyframes(frames);

            // for the animator to iterate forwards to the latest time ensuring we don't inadvertantly
            // rewind at all.
            streamingAnimator.setTime(Math.max(streamingAnimator.endTime, streamingAnimator.time));

            // Update our cache once everything settles
            debouncer.run('update-cache', () => {
                // we only need to guarantee that the latest chunk in the buffered animator will
                // be reloaded because all previous chunks that have frames newly added will be
                // reset when the cache of "completed" chunks is updated.
                this.cacheAnimator.resetChunkAtTime(frames[frames.length - 1].time);
                this._updateCache();
                this.setTime(this.time);
            });
        });

        // save the buffered animator instance and provide a method for getting frame
        // data from cache
        cacheAnimator.getFrames = async (time: number, length: number) => {
            const liveFrames = this.streamingAnimator.frames || [];
            const earliestTime = liveFrames.length ? liveFrames[0].time : Infinity;

            if (earliestTime >= time && earliestTime < time + length) {
                return liveFrames;
            } else {
                const cacheFrames = await this.framesCache.get(time);
                return cacheFrames || [];
            }
        };

        this.currAnimator = cacheAnimator;
        this.time = 0;

        this._lastKeyframeState = {} as T;
        this._lastKeyframeTime = -1;

        this._registerForwardingEvents(streamingAnimator);
        this._registerForwardingEvents(cacheAnimator);
    }

    get ready(): boolean {
        return true;
    }

    /**
     * @member {Boolean}
     */
    get endTime() {
        return this.streamingAnimator.endTime;
    }

    /**
     * @member {Boolean}
     */
    get startTime() {
        return this.cacheAnimator.startTime;
    }

    /**
     * @member {Boolean}
     */
    // @ts-expect-error(tumbar) Typescript does not support overriding members with accessors yet...
    get stale() {
        return this.currAnimator.stale;
    }

    set stale(v: boolean) {
    }

    /**
     * @member {Object}
     */
    // @ts-expect-error(tumbar) Typescript does not support overriding members with accessors yet...
    get state() {
        return this.currAnimator.state;
    }

    set state(s: T) {
    }

    /**
     * @member {Boolean}
     */
    // @ts-expect-error(tumbar) Typescript does not support overriding members with accessors yet...
    set interpolate(val: boolean) {
    }

    /**
     * @member {Boolean}
     */
    // @ts-expect-error(tumbar) Typescript does not support overriding members with accessors yet...
    set traverseArrays(v) {
    }

    get traverseArrays() {
        return this.streamingAnimator.traverseArrays;
    }

    // @ts-expect-error(tumbar) Typescript does not support overriding members with accessors yet...
    get frames() {
        return this.currAnimator.frames;
    }

    set frames(f: Frame<T>[]) {
    }

    _registerForwardingEvents(animator: TelemetryAnimator<T>) {
        const conditonalDispatch = (e: HoneycombEvent) => {
            if (this.currAnimator === animator) {
                this.dispatchEvent(e);
            }
        };

        const immediateDispatch = (e: HoneycombEvent) => {
            this.dispatchEvent(e);
        };

        animator.addEventListener('added-frames', immediateDispatch);
        animator.addEventListener('error', immediateDispatch);

        animator.addEventListener('change', conditonalDispatch);
        animator.addEventListener('reset', conditonalDispatch);
        animator.addEventListener('keyframe-progress', conditonalDispatch);
        animator.addEventListener('connected', conditonalDispatch);
        animator.addEventListener('disconnected', conditonalDispatch);
    }

    async setTime(time: number): Promise<void> {
        if (this.streamingAnimator.disposed) {
            return;
        }

        // If the time is ahead of our live data time then we assume it's
        // coming from the streaming data
        this.time = time;
        const pr: Promise<void>[] = [];
        if (time >= this.streamingAnimator.time) {
            pr.push(this.streamingAnimator.setTime(time));
            this.currAnimator = this.streamingAnimator;
        } else {
            this.currAnimator = this.cacheAnimator;
        }

        pr.push(this.cacheAnimator.setTime(time));
        await Promise.all(pr);
        return;
    }

    getNextSignificantTime() {
        return this.currAnimator.getNextSignificantTime();
    }

    getPrevSignificantTime() {
        return this.currAnimator.getPrevSignificantTime();
    }

    async reset() {
        if (this.streamingAnimator?.disposed) {
            return;
        } else if (this.streamingAnimator) {
            this.setTime(0);
        }
    }

    forEachFrame(cb: (state: T, time: number) => void, options?: TelemetryAnimatorForEachFrame): Promise<void> {
        return this.cacheAnimator.forEachFrame(cb, options) ?? Promise.resolve();
    };

    addFrames(frames: Frame<T>[]) {
        const liveAnim = this.streamingAnimator;
        liveAnim.addFrames(frames);
    }

    seekBack(cb: (state: T, time: number) => boolean, fromTime?: number) {
        return this.cacheAnimator.seekBack(cb, fromTime);
    }

    optimize() { }

    dispose() {
        this.streamingAnimator.dispose();
        this.cacheAnimator.dispose();
    }

    _updateKeyframes(frames: Frame<T>[]) {
        const liveAnim = this.streamingAnimator;
        const buffAnim = this.cacheAnimator;
        const lastKeyframeState = this._lastKeyframeState;
        let lastKeyframeTime = this._lastKeyframeTime;
        if (lastKeyframeTime === -1) {
            lastKeyframeTime = frames[0].time;
        }

        // Iterate over the new frames and roll up a new keyframe state then
        // save it once we've rolled over into a new one
        let currId = buffAnim.resolveToNextKeyframeTime(lastKeyframeTime);
        frames.forEach(f => {
            const thisId = buffAnim.resolveToNextKeyframeTime(f.time);
            if (currId !== thisId) {
                const cachedObj = copyOnTo(lastKeyframeState, {}, this.traverseArrays);
                buffAnim.keyframes.set(currId, cachedObj);
                currId = thisId;
            }
            liveAnim.mergeState(f.state, lastKeyframeState);
        });
        this._lastKeyframeTime = frames[frames.length - 1].time;
    }

    _updateCache() {
        const liveAnim = this.streamingAnimator;
        const buffAnim = this.cacheAnimator;
        const framesCache = this.framesCache;
        const liveFrames = liveAnim.frames;

        // If there's not data then don't bother
        if (liveFrames.length === 0) return;

        // If the frames from before are in a different buffer "page" then
        // try to cache some data
        const earliestFrameTime = liveAnim.frames[0].time;
        const lastChunkTime = buffAnim.resolveToChunkTime(earliestFrameTime);
        const nextChunkTime = buffAnim.resolveToChunkTime(liveAnim.endTime);
        if (lastChunkTime !== nextChunkTime) {
            let currId = lastChunkTime;
            let toCache: Frame<T>[] = [];
            for (let i = 0, l = liveFrames.length; i < l; i++) {
                // roll up frames until we encounter a new page as long as it's not the newest
                // then save them to the cache
                const frame = liveFrames[i];
                const { time } = frame;
                const thisId = buffAnim.resolveToChunkTime(time);
                if (thisId === nextChunkTime) {
                    break;
                } else {
                    if (thisId !== currId) {
                        framesCache.set(currId, toCache);
                        buffAnim.resetChunkAtTime(currId);

                        toCache = [];
                        currId = thisId;
                    }
                    toCache.push(frame);
                }
            }

            framesCache.set(currId, toCache);
            liveAnim._trimFrames(nextChunkTime);
            buffAnim.resetChunkAtTime(currId);
        }
    }
}
