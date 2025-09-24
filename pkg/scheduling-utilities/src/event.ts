import { LinkedList } from './linkedlist';
import { Disposable } from './common';

interface Listener<T> {
    listener: (e: T) => any;
    thisArgs?: any;
}

export class Emitter<T> implements Disposable {
    private nextListenerId: number = 0;
    protected listeners = new Map<number, Listener<T>>();

    constructor() {
        this.event = (listener: (e: T) => any, thisArgs?: any, disposables?: Disposable[]) => {
            const id = this.nextListenerId++;
            this.listeners.set(id, {
                listener,
                thisArgs
            });

            const disp = {
                dispose: () => {
                    this.listeners.delete(id);
                }
            };

            disposables?.push(disp);
            return disp;
        };
    }

    event: (listener: (e: T) => any, thisArgs?: any, disposables?: Disposable[]) => Disposable;

    fire(value: T) {
        for (const listener of this.listeners.values()) {
            try {
                if (listener.thisArgs) {
                    listener.listener.call(listener.thisArgs, value);
                } else {
                    listener.listener(value);
                }
            } catch (e) {
                console.error(e);
            }
        }
    }

    dispose() {
        this.nextListenerId = 0;
        this.listeners.clear();
    }
}

export class PauseableEmitter<T> extends Emitter<T> {

    private _isPaused = 0;
    protected _eventQueue = new LinkedList<T>();
    private _mergeFn?: (input: T[]) => T;

    public get isPaused(): boolean {
        return this._isPaused !== 0;
    }

    constructor(options?: { merge?: (input: T[]) => T }) {
        super();
        this._mergeFn = options?.merge;
    }

    pause(): void {
        this._isPaused++;
    }

    resume(): void {
        if (this._isPaused !== 0 && --this._isPaused === 0) {
            if (this._mergeFn) {
                // use the merge function to create a single composite
                // event. make a copy in case firing pauses this emitter
                if (this._eventQueue.size > 0) {
                    const events = Array.from(this._eventQueue);
                    this._eventQueue.clear();
                    super.fire(this._mergeFn(events));
                }

            } else {
                // no merging, fire each event individually and test
                // that this emitter isn't paused halfway through
                while (!this._isPaused && this._eventQueue.size !== 0) {
                    super.fire(this._eventQueue.shift()!);
                }
            }
        }
    }

    override fire(event: T): void {
        if (this.listeners.size) {
            if (this._isPaused !== 0) {
                this._eventQueue.push(event);
            } else {
                super.fire(event);
            }
        }
    }
}

export class DebounceEmitter<T> extends PauseableEmitter<T> {

    private readonly _delay: number;
    private _handle: any | undefined;

    constructor(options?: { merge: (input: T[]) => T; delay?: number }) {
        super(options);
        this._delay = options?.delay ?? 100;
    }

    override fire(event: T): void {
        if (!this._handle) {
            this.pause();
            this._handle = setTimeout(() => {
                this._handle = undefined;
                this.resume();
            }, this._delay);
        }
        super.fire(event);
    }
}
