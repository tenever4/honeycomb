export interface CancellablePromise<T> extends PromiseLike<T> {
    /**
     * Cancel the current ask and remove it from the queue so it's not run.
     */
    cancel(): void;
}

export interface CancellablePromiseTask<T> extends Promise<T> {
    name?: string;
    debouncer?: any;

    /**
     * Run the task now and remove it from the queue.
     */
    flush(): void;
    cancel(): void;

    queue: CancellablePromiseTask<unknown>[];
    priority: number;

    /**
     * Job executor
     */
    run(): void;
}

/**
 * Class for scheduling events with a priority order before the end
 * of the frame. If the queue of events has already been run this frame
 * they are scheduled for the next frame. A singleton of this class is
 * exported as `Scheduler` from the package.
 *
 * The Scheduler runs a consistent loop in the background that runs tasks
 * every frame or every 500ms, which ever comes first.
 */
class Scheduler {
    tasks: CancellablePromiseTask<unknown>[];
    nextFrameTasks: CancellablePromiseTask<unknown>[];

    scheduled: boolean;
    nextFrameScheduled: boolean;
    awaitingNextFrame: boolean;

    constructor() {
        this.tasks = [];
        this.nextFrameTasks = [];
        this.scheduled = false;
        this.nextFrameScheduled = false;
        this.awaitingNextFrame = false;

        // Schedule an interval that happens every frame or 500ms to run any scheduled tasks.
        let toHandle: any = -1;
        let rafHandle = -1;
        const scheduleInterval = () => {
            clearTimeout(toHandle);
            cancelAnimationFrame(rafHandle);

            toHandle = setTimeout(scheduleInterval, 500);
            rafHandle = requestAnimationFrame(scheduleInterval);

            this.flush();

            const tasks = this.tasks;
            const nextFrameTasks = this.nextFrameTasks;
            while (nextFrameTasks.length !== 0) {
                const job = nextFrameTasks.pop()!;
                this._insertJob(job, tasks);
            }
        };
        scheduleInterval();
    }

    /**
     * Run all tasks in the queue.
     */
    flush() {
        // Shift tasks off the list instead of just iterating over them
        // because new tasks could be added to the list during evaluation.
        const tasks = this.tasks;
        let totalRun = 0;
        while (tasks.length !== 0) {
            const task = tasks.shift();
            task!.run();

            totalRun++;
            if (totalRun >= 500) {
                console.warn('Scheduler: Over the maximum number of 500 tasks were scheduled to run. Stopping early.');
                break;
            }
        }
    }

    /**
     * Schedules a task to be run when the next flush of tasks is scheduled to run, which is often at the
     * end of the current frame. If they cannot be run at the end of the current frame or the queue of tasks
     * has already been flushed then the task will be run next frame.
     *
     * Priority indicates the order in which functions will get run. So a task with a priority of `0` will
     * get run first while one with a priority of `100` will get run last. If a called task adds a callback
     * to the queue it will get _added and run to the queue that is currently being flushed_, meaning it will
     * get called before the current frame ends.
     */
    schedule<T = void>(func: () => T, priority: number = 0) {
        return this._schedule<T>(func, priority, this.tasks);
    }

    /**
     * Like {@link #Scheduler#schedule schedule} but queues a task to get run next frame along with other tasks
     * that need to get run.
     */
    scheduleNextFrame<T>(func: () => T, priority: number = 0): CancellablePromiseTask<T> {
        return this._schedule<T>(func, priority, this.nextFrameTasks);
    }

    private _schedule<T>(func: () => T, priority: number, queue: CancellablePromiseTask<unknown>[]): CancellablePromiseTask<T> {
        let resolve: (t: T) => void;
        const pr = new Promise<unknown>(_resolve => (resolve = _resolve)) as CancellablePromiseTask<T>;
        pr.priority = priority;
        pr.queue = queue;
        pr.run = () => resolve(func());
        pr.flush = () => {
            pr.cancel();
            pr.run();
        };
        pr.cancel = () => {
            const index = pr.queue.indexOf(pr);
            if (index !== -1) {
                pr.queue.splice(index, 1);
            }
        };

        this._insertJob(pr, queue);

        return pr;
    }

    private _insertJob<T>(job: CancellablePromiseTask<T>, queue: CancellablePromiseTask<unknown>[]) {
        const priority = job.priority;
        job.queue = queue;
        let inserted = false;
        for (let i = 0, l = queue.length; i < l; i++) {
            const t = queue[i];
            if (t.priority > priority) {
                queue.splice(i, 0, job);
                inserted = true;
                break;
            }
        }

        if (!inserted) {
            queue.push(job);
        }
    }
}

const instance = new Scheduler();
export { instance as Scheduler };
