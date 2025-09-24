import { diffState } from '@gov.nasa.jpl.honeycomb/telemetry-animator';

/**
 * A class for tracking and checking the difference between two objects and whether or
 * not a file path has changed.
 */
class StateDiff<T> {
    private _diff: Record<string, any> | boolean;

    constructor(initialObject: boolean = false) {
        this._diff = initialObject;
    }

    /**
     * Updates the StateDiff object to store and check the differences between the two objects.
     * @param {Object} from
     * @param {Object} to
     */
    update(from: T, to: T) {
        this._diff = diffState(from, to);
    }

    /**
     * Takes a list of tokens representing the recursive object keys to test. If a field has been added,
     * removed, or changed between the two objects being diffed then "true" will be returned.
     * @param  {...string} tokens
     * @returns {Boolean}
     */
    didChange(...tokens: (keyof T)[]): boolean {
        let curr = this._diff;
        for (let i = 0, l = tokens.length; i < l; i++) {
            const t = tokens[i];
            if (curr === true) {
                return true;
            } else if (curr === false) {
                return false;
            } else if (t in curr) {
                curr = curr[t as string];
            } else {
                return false;
            }
        }
        return !!curr;
    }
}

export { StateDiff };
