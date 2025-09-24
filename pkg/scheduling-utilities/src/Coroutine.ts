import { Scheduler } from './Scheduler';

export interface Task<T> {
    call(coroutine: Coroutine<T>, ...args: any): Generator<T>;
}

/** Class for running a coroutine over multiple frames using a generator. */
export class Coroutine<T> {
    private _activeTask: Generator<T> | null;
    private _task: Task<T>;
    private _cancel: (() => void) | null;

    /**
     * Field indicating the order to run the task with in the scheduler. Smaller numbers
     * are run first.
     */
    priority: number = 0;

    /**
     * Getter indicating whether or not the coroutine is currently running.
     * @member {Boolean}
     */
    get running() {
        return Boolean(this._activeTask);
    }

    /**
     * Takes a generator function "task" to run over multiple frames and an optional
     * "cancel" function which will run if the coroutine is cancelled mid run.
     */
    constructor(task: Task<T>, cancel: (() => void) | null = null) {
        this._task = task;
        this._cancel = cancel;
        this._activeTask = null;
    }

    /**
     * Runs the coroutine. Any arguments passed to this function are passed into the task
     * function. Throws an error if a task is already runninig.
     */
    run(...args: any) {
        if (this.running) {
            throw new Error('Coroutine: Task is already running.');
        }

        const task = this._task;
        const priority = this.priority;
        const activeTask = task.call(this, ...args);
        this._activeTask = activeTask;

        const _run = () => {
            if (this._activeTask === activeTask) {
                const result = activeTask.next();
                if (!result.done) {
                    Scheduler.scheduleNextFrame(_run, priority);
                } else {
                    this._activeTask = null;
                }
            }
        };
        Scheduler.schedule(_run, priority);
    }

    /**
     * Cancels the current running task if there is one and returns true if a task was running.
     */
    cancel(): boolean {
        if (!this.running) {
            return false;
        }

        this._activeTask = null;

        if (this._cancel) {
            this._cancel.call(this);
        }

        return true;
    }
}
