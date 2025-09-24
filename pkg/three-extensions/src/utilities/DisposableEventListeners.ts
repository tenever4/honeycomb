import { EventCallback, IEventDispatcher } from "@gov.nasa.jpl.honeycomb/event-dispatcher";
import { Disposable } from "@gov.nasa.jpl.honeycomb/common";

/**
 * Class for registering and tracking events on an `EventListener`
 * so they can be easily disposed of and removed.
 */
export class DisposableEventListeners {
    listeners = new Set<{ target: IEventDispatcher, name: string, callback: EventCallback }>();

    /**
     * Add an event listener on `target` for event `name`
     * @param {EventDispatcher} target
     * @param {String} name
     * @param {Function} callback
     * @returns {void}
     */
    addEventListener(target: IEventDispatcher, name: string, callback: EventCallback): Disposable {
        target.addEventListener(name, callback);
        const listener = { target, name, callback };
        this.listeners.add(listener);
        return {
            dispose: () => {
                const { target, name, callback } = listener;
                target.removeEventListener(name, callback);
                this.listeners.delete(listener);
            }
        };
    }

    /**
     * Remove all event listeners that have been registered with this instance.
     * @returns {void}
     */
    dispose(): void {
        const listeners = this.listeners;
        for (const { target, name, callback } of this.listeners) {
            target.removeEventListener(name, callback);
        }

        listeners.clear();
    }
}
