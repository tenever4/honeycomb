import { Debouncer } from '@gov.nasa.jpl.honeycomb/scheduling-utilities';
import type { HoneycombEvent } from '@gov.nasa.jpl.honeycomb/event-dispatcher';
import { TelemetryAnimator } from './TelemetryAnimator';
import type { StateBase } from '@gov.nasa.jpl.honeycomb/common';

/**
 * Animator made up of multiple animators and produces a state composed of
 * all frame data in the child canimators.
 *
 * @extends TelemetryAnimator
 * @extends EventDispatcher
 */
class JoinedTelemetryAnimator<T extends StateBase> extends TelemetryAnimator<T> {
    /**
     * @member {Boolean}
     */
    get ready() {
        for (const a in this.animators) {
            if (this.animators[a].ready) {
                return true;
            }
        }

        return false;
    }

    /**
     * @member {Boolean}
     */
    // @ts-expect-error(tumbar) Typescript does not support overriding members with accessors yet...
    get seekable() {
        let res = true;
        for (const a in this.animators) {
            res = res && this.animators[a].seekable;
        }

        return res;
    }

    set seekable(_: boolean) { }

    /**
     * @member {Boolean}
     */
    // @ts-expect-error(tumbar) Typescript does not support overriding members with accessors yet...
    get liveData() {
        let res = false;
        for (const a in this.animators) {
            res = res || this.animators[a].liveData;
        }

        return res;
    }
    set liveData(_: boolean) { }

    /**
     * @member {Boolean}
     */
    // @ts-expect-error(tumbar) Typescript does not support overriding members with accessors yet...
    set interpolate(val) {
        // changing 'interpolate' will cause all animators to
        // reset their state to an un-interpolated one
        for (const a in this.animators) {
            this.animators[a].interpolate = val;
        }
    }

    /**
     * @member {Boolean}
     */
    // @ts-expect-error(tumbar) Typescript does not support overriding members with accessors yet...
    get stale() {
        let res = false;
        for (const a in this.animators) {
            res = res || !!this.animators[a].stale;
        }

        return res;
    }
    set stale(_: boolean) { }

    /**
     * @member {Number}
     */
    get endTime() {
        let val = -Infinity;
        for (const a in this.animators) {
            const anim = this.animators[a];
            const isEmpty =
                !anim.frames ||
                (anim.startTime === 0 && anim.endTime === 0 && anim.frames.length === 0);

            if (!isEmpty) {
                val = Math.max(anim.endTime, val);
            }
        }
        return val === -Infinity ? 0 : val;
    }

    /**
     * @member {Number}
     */
    get startTime() {
        let val = Infinity;
        for (const a in this.animators) {
            const anim = this.animators[a];
            const isEmpty =
                !anim.frames ||
                (anim.startTime === 0 && anim.endTime === 0 && anim.frames.length === 0);

            if (!isEmpty) {
                val = Math.min(anim.startTime, val);
            }
        }
        return val === Infinity ? 0 : val;
    }

    /**
     * @member {Boolean}
     */
    get generatingKeyframes(): boolean {
        let val = false;
        for (const a in this.animators) {
            val = val || (this.animators[a] as JoinedTelemetryAnimator<T>).generatingKeyframes;
        }
        return val;
    }

    /**
     * @member {Number}
     */
    get generatedKeyframesUpTo() {
        let val = Infinity;
        for (const a in this.animators) {
            const anim = this.animators[a];
            if ((anim as JoinedTelemetryAnimator<T>).generatingKeyframes) {
                val = Math.min(val, (anim as JoinedTelemetryAnimator<T>).generatedKeyframesUpTo);
            }
        }
        return val === Infinity ? -1 : val;
    }

    animators: Record<string, TelemetryAnimator<Partial<T>>>;
    readonly isJoinedTelemetryAnimator: boolean = true;

    private _changeCallback: () => void;
    private _resetCallback: () => void;
    private _errorCallback: (e: HoneycombEvent) => void;
    private _addFramesCallback: () => void;
    private _keyframesCallback: () => void;
    private _connectedCallback: (e: HoneycombEvent) => void;
    private _disconnectedCallback: (e: HoneycombEvent) => void;

    /**
     * @param {(Object<Record, TelemetryAnimator<StateBase>>)} [animators={}]
     */
    constructor(animators?: (Record<string, TelemetryAnimator<Partial<T>>>)) {
        super();

        this.animators = {};

        /**
         * @member {Number}
         */
        this.time = 0;

        this._debouncer = new Debouncer();
        this._disposed = false;

        this._changeCallback = () => {
            this._debouncer.run('change', () => this.triggerOnChange());
        };

        this._resetCallback = () => {
            this._debouncer.run('reset', () => this.triggerOnReset());
        };

        this._errorCallback = e => {
            this.dispatchEvent(e);
        };

        this._addFramesCallback = () => {
            this._debouncer.run('added-frames', () => this.dispatchEvent({ type: 'added-frames' }));
        };

        this._keyframesCallback = () => {
            this._debouncer.run('keyframe-progress', () =>
                this.dispatchEvent({ type: 'keyframe-progress' }),
            );
        };

        this._connectedCallback = e => {
            this.dispatchEvent({
                type: 'connected',
                animator: e.target,
            });
        };

        this._disconnectedCallback = e => {
            this.dispatchEvent({
                type: 'disconnected',
                animator: e.target,
            });
        };

        for (const name in animators) {
            this.addAnimator(animators[name], name);
        }
    }

    /* Public Functions */
    async setTime(t: number) {
        if (this._disposed) {
            return;
        }

        this.time = t;
        const promises: Promise<void>[] = [];
        for (const a in this.animators) {
            const pr = this.animators[a].setTime(t);
            if (pr) {
                promises.push(pr);
            }
        }

        await Promise.all(promises);
    }

    getNextSignificantTime(keys?: Iterable<string>) {
        keys = keys ?? Object.keys(this.animators);
        const animators = this.animators;
        let minTime = Infinity;

        for (const key of keys) {
            const an = animators[key];
            if (an) {
                const nextTime = an.getNextSignificantTime();
                if (nextTime !== null) {
                    minTime = Math.min(nextTime, minTime);
                }
            }
        }

        return minTime === Infinity ? null : minTime;
    }

    getPrevSignificantTime(keys?: string[]) {
        keys = keys || Object.keys(this.animators);
        const animators = this.animators;
        let maxTime = -Infinity;

        for (const key of keys) {
            const an = animators[key];
            if (an) {
                const prevTime = an.getPrevSignificantTime();
                if (prevTime !== null) {
                    maxTime = Math.max(prevTime, maxTime);
                }
            }
        }

        return maxTime === -Infinity ? null : maxTime;
    }

    async reset() {
        if (this._disposed) {
            return;
        }

        for (const name in this.animators) {
            this.animators[name].reset();
        }
        this.setTime(0);
    }

    async forEachFrame() {
        throw new Error('Not Implemented');
    }

    /**
     * Add an animator with the given name.
     *
     * @param {TelemetryAnimator} animator
     * @param {String} id
     * @returns {void}
     */
    addAnimator<P extends Partial<T>>(animator: TelemetryAnimator<P>, id: string): void {
        if (id in this.animators) {
            throw new Error(`Animator "${id}" already exists.`);
        }

        if (animator.seekable !== this.seekable && Object.keys(this.animators).length !== 0) {
            throw new Error('All animators must have the same seekable state.');
        }

        this.animators[id] = animator;

        // Use a getter because the underlying animator might use a getter to
        // switch where the state is coming from.
        Object.defineProperty(this.state, id, {
            configurable: true,
            enumerable: true,
            get() {
                return animator.state;
            },
        });

        animator.setTime(this.time);
        animator.addEventListener('added-frames', this._addFramesCallback);
        animator.addEventListener('change', this._changeCallback);
        animator.addEventListener('reset', this._resetCallback);
        animator.addEventListener('error', this._errorCallback);
        animator.addEventListener('keyframe-progress', this._keyframesCallback);
        animator.addEventListener('connected', this._connectedCallback);
        animator.addEventListener('disconnected', this._disconnectedCallback);
        this.dispatchEvent({ type: 'add-animator', name: id, animator });
        this.triggerOnChange();
    }

    /**
     * Removes the animator with the given name.
     *
     * @param {String} name
     * @returns {void}
     */
    removeAnimator(name: string): void {
        const animator = this.animators[name];

        delete this.state[name];
        delete this.animators[name];

        if (animator) {
            animator.removeEventListener('added-frames', this._addFramesCallback);
            animator.removeEventListener('change', this._changeCallback);
            animator.removeEventListener('reset', this._resetCallback);
            animator.removeEventListener('error', this._errorCallback);
            animator.removeEventListener('keyframe-progress', this._keyframesCallback);
            animator.removeEventListener('connected', this._connectedCallback);
            animator.removeEventListener('disconnected', this._disconnectedCallback);

            this.dispatchEvent({ type: 'remove-animator', name, animator });
        }

        this.triggerOnChange();
    }

    optimize() {
        for (const a in this.animators) {
            this.animators[a].optimize();
        }
    }

    dispose() {
        TelemetryAnimator.prototype.dispose.call(this);
        for (const anim in this.animators) {
            this.animators[anim].dispose();
        }
    }

    dispatchEvent(e: HoneycombEvent) {
        if (this._disposed) {
            return;
        }

        super.dispatchEvent(e);
    }

    /* Private Functions */
    triggerOnChange() {
        this.dispatchEvent({ type: 'change', time: this.time, state: this.state });
    }

    triggerOnReset() {
        this.dispatchEvent({ type: 'reset' });
    }
}

export { JoinedTelemetryAnimator };
