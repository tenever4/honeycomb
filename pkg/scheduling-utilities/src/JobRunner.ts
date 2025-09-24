interface Job<T> {
    resolve: (res: T) => void;
    reject: (err: any) => void;
    promise: Promise<T> & { cancel?: () => void };
    func: () => T;

    isRunning: boolean;
}

/**
 * Utility for enqueing an optionally cancelable, asynchronous task that you only want
 * to perform a few of at a time, such as file reads, http requests, etc. Only a certain
 * number of jobs will be actively running at once. Once a job completes more will start.
 */
export class JobRunner {
    /**
     * The maximum number of jobs that can be run at once.
     */
    maxJobs: number = 10;

    jobs: Set<Job<any>>;
    private _runningJobs: number;

    constructor() {
        this.jobs = new Set();
        this._runningJobs = 0;
    }

    /**
     * Enqueues a task to be run. If there are fewer then [maxJobs](#.maxJobs) running then the task will
     * be run immediately. The returned promise includes a `cancel` function on it which can be used to
     * remove the task from the job queue. If a task is cancelled then the `cancel` callback passed into
     * the function will be called only if the task has already begun running.
     */
    run<T>(func: () => T, cancel?: () => void): Promise<T> {
        const job = {} as Job<T>;
        const pr = new Promise<T>((resolve, reject) => {
            job.resolve = resolve;
            job.reject = reject;
        }) as Promise<T> & { cancel?: () => void };

        job.promise = pr;
        job.func = func;
        job.isRunning = false;
        pr.cancel = () => {
            this.jobs.delete(job);
            if (cancel && job.isRunning) {
                cancel();
            }
            delete pr.cancel;
        };

        this.jobs.add(job);
        this._tryRunJobs();
        return pr;
    }

    _tryRunJobs() {
        const jobs = this.jobs;
        for (const job of jobs) {
            if (this._runningJobs >= this.maxJobs) break;

            this._runningJobs++;
            jobs.delete(job);

            job.isRunning = true;
            job.func()
                .then((res: any) => {
                    job.resolve(res);
                    this._runningJobs--;
                    this._tryRunJobs();
                })
                .catch((error: any) => {
                    job.reject(error);
                    this._runningJobs--;
                    this._tryRunJobs();
                });
        }
    }
}
