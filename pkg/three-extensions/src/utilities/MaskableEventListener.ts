import { EventCallback, IEventDispatcher } from "@gov.nasa.jpl.honeycomb/event-dispatcher";
import { Disposable } from "@gov.nasa.jpl.honeycomb/common";
import { DisposableEventListeners } from "./DisposableEventListeners";
import { InteractionManager } from "@gov.nasa.jpl.honeycomb/interaction-manager";

/**
 * Class for registering and tracking events on an `EventListener`
 * so they can be easily disposed of and removed. They can also be
 * masked so they don't trigger while the mask is active
 */
export class MaskableEventListener extends DisposableEventListeners {
    private _mask: boolean = false;
    private _lock: any = null;

    constructor(readonly interactionManager: InteractionManager) {
        super();
    }

    /**
     * Set's the event mask which blocks the dispatch of the event
     * listeners when the mask is 'true'
     */
    set mask(v: boolean) {
        this._mask = v;
        if (this._mask) {
            if (this._lock) {
                this.interactionManager.unlock(this._lock);
            }

            this.onMasked();
        } else {
            if (this._lock) {
                this.interactionManager.lock(this._lock);
            }

            this.onUnmasked();
        }
    }

    get mask(): boolean {
        return this._mask;
    }

    private maskedCallback(callback: EventCallback): EventCallback {
        return (v: any) => {
            if (!this._mask) {
                callback(v);
            }
        };
    }

    lock(target: any) {
        if (this.interactionManager.lock(target)) {
            this._lock = target;
        }
    }

    unlock(target: any) {
        if (this.interactionManager.unlock(target)) {
            this._lock = null;
        }
    }

    addEventListener(target: IEventDispatcher | null, name: string, callback: EventCallback): Disposable {
        callback = this.maskedCallback(callback);

        if (!target) {
            return this.interactionManager.addEventListener(name, callback);
        } else {
            return super.addEventListener(target, name, callback);
        }
    }

    onMasked() { }
    onUnmasked() { }
}
