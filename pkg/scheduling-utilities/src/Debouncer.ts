import { Scheduler, CancellablePromiseTask } from './Scheduler';

/**
 * Reusable class instance for defining, tracking, and flushing tasks that
 * are debounced to run at the end of frame. Uses {@link #Scheduler Scheduler} to
 * schedule tasks.
 */
export class Debouncer {
    _debounces: { [name: string]: CancellablePromiseTask<unknown> };

    constructor() {
        this._debounces = {};
    }

    /**
     * Creates a task to be run at the end of frame with the unique key `name`. If a
     * task with the given name is already scheduled it will be cancelled in favor
     * of the new one.
     *
     * Priority corresponds to the priority concept used in {@link #Scheduler Scheduler}.
     */
    run(name: string, func: () => void, priority: number = 0): CancellablePromiseTask<void> {
        this.cancel(name);

        const job = Scheduler.schedule(() => {
            if (this._debounces[name] === job) {
                delete this._debounces[name];
            }
            func();
        }, priority);
        const ogCancel = job.cancel;
        job.cancel = () => {
            ogCancel.call(job);
            if (this._debounces[name] === job) {
                delete this._debounces[name];
            }
        };

        job.name = name;
        this._debounces[name] = job;
        job.debouncer = this;

        return job;
    }

    /**
     * Flushes the task with the given name and runs it now.
     *
     * Returns true of the task existed.
     */
    flush(name: string): boolean {
        if (name in this._debounces) {
            this._debounces[name].flush();
            delete this._debounces[name];
            return true;
        }
        return false;
    }

    /**
     * Flushes every scheduled task.
     *
     * @returns {void}
     */
    flushAll() {
        for (const name in this._debounces) {
            this.flush(name);
        }
    }

    /**
     * Cancels the task with the given name.
     *
     * Returns true of the task existed.
     *
     * @param {String} name
     * @returns {Boolean}
     */
    cancel(name: string) {
        if (name in this._debounces) {
            this._debounces[name].cancel();
            delete this._debounces[name];
            return true;
        }
        return false;
    }

    /**
     * Cancels every scheduled task.
     */
    cancelAll() {
        for (const name in this._debounces) {
            this.cancel(name);
        }
    }
}
