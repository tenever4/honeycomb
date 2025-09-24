import { Disposable } from "@gov.nasa.jpl.honeycomb/common";

export abstract class Optimization {
    canIncreaseWork() { return true; }
    canDecreaseWork() { return true; }

    abstract increaseWork(delta: number): void;
    abstract decreaseWork(delta: number): void;

    optimize(delta: number) {
        if (delta < 0) {
            if (this.canDecreaseWork()) {
                this.decreaseWork(delta);
                return true;
            }
        } else {
            if (this.canIncreaseWork()) {
                this.increaseWork(delta);
                return true;
            }
        }

        return false;
    }
}

class FunctionOptimization extends Optimization {
    increaseWork(_: number): void { }
    decreaseWork(_: number): void {}

    constructor(public readonly optimize: (delta: number) => boolean) {
        super();
    }
}

export interface OptimizerOptions {
    /**
     * The target milliseconds to hit in the enclosed code block.
     * This cannot be _less_ than `16.66...` because browser caps
     * the framerate to 60 frames per second. If this is less than
     * that the optimizer will continually decrease quality to try
     * to get performance up.
     *
     * Defaults to `16.66...`.
     */
    targetMillis: number;

    /**
     * The target framerate to hit. This overrides
     * `targetMillis` if it is set.
     *
     * Defaults to `undefined`.
     */
    targetFramerate?: number;

    /**
     * How often to perform a check sample the
     * average framerate to try to optimize in milliseconds.
     *
     * Defaults to `500` or half a second.
     */
    interval: number;

    /**
     * At most how many frames can run before an optimization
     * should occur. This is useful when code may not run
     * consistently but runs as needed, meaning that checking
     * after a fixed amount of time might mean that an inconsistent
     * or no actual iterations has occurred. `Interval` should
     * probably be set to `Infinity` in this case.

     * Defaults to `Infinity`.
     */
    maxFrameSamples: number;

    /**
     * The amount of time to wait between sampling frames for a
     * new optimization. This is useful when an optimization may
     * cause the framerate to drop for a frame or two -- such as
     * with allocating a lot of new memory or new webgl render targets.
     *
     * Defaults to `0`;
     */
    waitMillis: number;

    /**
     * At most how many frames to wait for.
     *
     * Defaults to `Infinity`;
     */
    maxWaitFrames: number;

    /**
     * How far outside of the target framerate must be in
     * order for an optimization to occurs.
     *
     * Defaults to `0.05` or 5%.
     */
    margin: number;

    /**
     * By default the optimizer will stop trying to optimize and
     * optimization the page once the target framerate is hit or
     * no more optimizations can run and will never try to improv
     * quality of the page again after the first iteration.
     *
     * This option allows the optimizer to ping pong between improving
     * performance and quality continually to keep a steady framerate
     * Note that this may not be a good option when using "expensive"
     * optimizations that may stall the frame for a moment, like
     * compiling shaders.
     *
     * Defaults to `false`.
     */
    continuallyRefine: boolean;

    /**
     * Whether the optimizer should ever try to increase the amount
     * of work done at the cost of framerate. After the quality
     * improvements are made the optimizer tries to improve th
     * framerate until the target framerate is met.
     *
     * Defaults to `false`.
     */
    increaseWork: boolean;
}

/**
 * The optimizer tracks the amount of time spent between frames or
 * between calls to `begin` and `end` and calculates the difference
 * between the target amount of time to spend and the actual time
 * spent on the last frame. After the specified amount of time has
 * passed the average time spent is calculated and the framerate the
 * amount of work is either increased or decreased depending on whether
 * or not the time spent was above or below the target. The amount of
 * work is adjusted by iteratively calling prioritized optimizations
 * and sampling framerate until the target work time is met.
 */
export class Optimizer implements Disposable {
    private _enabled: boolean;
    private options: OptimizerOptions;
    private _increasingWork: boolean;
    private minPriority: number;
    private maxPriority: number;
    waitedFrames: number;
    private waitedMillis: number;
    private elapsedFrames: number;
    private elapsedTime: number;
    private beginTime: number;

    private currPriority?: number;
    private currOptimization: number;

    private _windowFocused: boolean;
    private _windowBlurFunc: () => void;
    private _windowFocusFunc: () => void;

    private optimizations: Record<number, Optimization[]>;

    completed: boolean;

    get enabled() {
        return this._enabled;
    }

    set enabled(val) {
        if (this._enabled !== val) {
            this.resetCheck();
        }

        this._enabled = val;
    }

    constructor(options?: Partial<OptimizerOptions>) {
        this.options = {
            // target milliseconds to hit in the code enclosed by
            // the optimizer
            targetMillis: 1000 / 60,
            targetFramerate: undefined,

            // how often to check performance
            interval: 500,
            maxFrameSamples: Infinity,

            // how long to wait between capturing frames
            waitMillis: 0,
            maxWaitFrames: Infinity,

            // how far outside the current framerate must be outside
            // the target to optimize
            margin: 0.05,

            // continue to improve quality and then performance over time
            // instead of just stopping after a single failed improvement.
            continuallyRefine: false,

            // whether not we're currently increasing the amount of work
            // done per frame (and thereby decreasing framerate)
            increaseWork: false,
            ...options
        };

        // convert the specified framerate option to millis
        if (this.options.targetFramerate !== undefined && this.options.targetFramerate > 0) {
            this.options.targetMillis = 1000 / this.options.targetFramerate;
            delete this.options.targetFramerate;
        }

        Object.defineProperty(options, 'targetFramerate', {
            get() { return 1000 / this.targetMillis; },
            set(v) { this.targetMillis = 1000 / v; },
        });

        this._enabled = true;
        this.completed = false;
        this._increasingWork = this.options.increaseWork;

        // the prioritized optimizations -- int : array
        // It would be best if this were sorted linked list so
        // large gaps don't cause unnecessary iteration
        this.optimizations = {};
        this.minPriority = Infinity;
        this.maxPriority = -Infinity;

        // Tracking the time between optimizations
        this.waitedFrames = this.options.maxWaitFrames;
        this.waitedMillis = this.options.waitMillis;
        this.elapsedFrames = 0;
        this.elapsedTime = 0;
        this.beginTime = -1;

        // The next optimization to try
        this.currOptimization = 0;

        this._windowFocused = true;
        this._windowBlurFunc = () => this._windowFocused = false;
        this._windowFocusFunc = () => {
            this._windowFocused = true;
            this.resetCheck();
        };

        window.addEventListener('blur', this._windowBlurFunc);
        window.addEventListener('focus', this._windowFocusFunc);
    }

    /**
     * Removes window events that the optimizer listens for,
     * including window `"blur"` and `"focus"`. It is expected
     * that the optimizer is no longer used after this.
     */
    dispose() {
        window.removeEventListener('blur', this._windowBlurFunc);
        window.removeEventListener('focus', this._windowFocusFunc);
    }

    /* Public API */
    // restarts the optimization process by first improving quality then
    // performance
    restart() {
        this.resetCheck();

        this._increasingWork = this.options.increaseWork;
        this.currPriority = undefined;
        this.currOptimization = 0;
        this.completed = false;
    }

    addSample(sampleTime: number) {
        // if we're not active for any reason, continue
        if (!this._enabled || !this._windowFocused || this.completed) return;

        // wait the required number of frames between calls
        if (this.waitedFrames !== 0 && this.waitedMillis !== 0) {
            this.waitedMillis -= sampleTime;
            this.waitedFrames--;

            this.waitedFrames = Math.max(this.waitedFrames, 0);
            this.waitedMillis = Math.max(this.waitedMillis, 0);
            return;
        }

        // increment the time and frames run
        this.elapsedTime += sampleTime;
        this.elapsedFrames++;

        // if we've waited for an appropriate amount of time
        if (this.elapsedTime >= this.options.interval || this.elapsedFrames >= this.options.maxFrameSamples) {

            // average time per frame and the differences
            const frameTime = this.elapsedTime / this.elapsedFrames;
            const delta = this.options.targetMillis - frameTime;
            const ratio = delta / this.options.targetMillis;
            const isOutsideMargin = Math.abs(ratio) > this.options.margin;
            const needsImproving = delta < 0 && isOutsideMargin;

            if (this._increasingWork) {
                if (this.currPriority === undefined) {
                    this.currPriority = this.minPriority;
                }

                // If our frame time is higher than we want, then
                // start trying to improve it.
                if (needsImproving) {
                    this._increasingWork = false;
                    this.currPriority = this.maxPriority;
                    this.currOptimization = 0;
                } else {
                    // delta will always be ~0 when targeting 60 fps because the
                    // browser runs at a fixed framerate
                    this.iterate(Math.max(delta, 1));
                }
            }

            // Try to improve the frame time
            if (!this._increasingWork) {
                if (this.currPriority === undefined) {
                    this.currPriority = this.maxPriority;
                }

                let didOptimize = false;
                if (needsImproving) {
                    didOptimize = this.iterate(delta);
                }

                if (!didOptimize) {
                    if (this.options.continuallyRefine) {
                        this._increasingWork = true;
                    } else {
                        this.completed = true;
                    }
                }
            }

            this.elapsedFrames = 0;
            this.elapsedTime = 0;
            this.waitedFrames = this.options.maxWaitFrames;
            this.waitedMillis = this.options.waitMillis;
        }
    }

    // begin the code block to optimize
    begin() {
        this.beginTime = window.performance.now();
    }

    // end the code block to optimize
    end() {
        // If end is called before begin then skip this iteration
        if (this.beginTime === -1) return;

        const timeFromBegin = window.performance.now() - this.beginTime;
        this.addSample(timeFromBegin);

    }

    // A single function to use _instead_ of "begin" and "end". The function
    // should be called once per frame to optimize on the full frame time
    update() {
        this.end();
        this.begin();
    }

    // add a optimization function at the given priority
    addOptimization(optimization: Optimization | ((delta: number) => boolean), priority: number = 0) {
        if (typeof optimization === "function") {
            optimization = new FunctionOptimization(optimization);
        }

        this.optimizations[priority] = this.optimizations[priority] || [];
        this.optimizations[priority].push(optimization);

        this.minPriority = Math.min(this.minPriority, priority);
        this.maxPriority = Math.max(this.maxPriority, priority);
    }

    /* Private Functions */
    // Iterates over the optimizations based on the delta. Improving quality if delta > 0
    // and performance if delta < 0
    iterate(delta: number) {
        let done = false;

        if (this.currPriority === undefined) {
            this.currPriority = this.minPriority;
        }

        while (this.currPriority <= this.maxPriority && this.currPriority >= this.minPriority) {
            // search for a optimization we can perform to improve performance
            // if we get through all optimizations without an improvement then
            // move on to the next priority level.
            const optimizations = this.optimizations[this.currPriority];
            if (optimizations) {
                for (let i = 0; !done && i < optimizations.length; i++) {
                    done = optimizations[this.currOptimization].optimize(delta);
                    if (typeof done !== 'boolean') {
                        done = !!done;
                        console.warn('Optimizer: Optimization function not returning a boolean value.');
                    }

                    this.currOptimization = (this.currOptimization + 1) % optimizations.length;
                }
            }

            if (done) {
                break;
            } else {
                // Lower priority numbers are more important
                this.currPriority += delta > 0 ? 1 : -1;
                this.currOptimization = 0;
            }
        }

        return done;
    }

    // resets the current frame check
    resetCheck() {
        this.elapsedFrames = 0;
        this.elapsedTime = 0;
        this.waitedFrames = this.options.maxWaitFrames;
        this.waitedMillis = this.options.waitMillis;
        this.beginTime = -1;
    }
}
