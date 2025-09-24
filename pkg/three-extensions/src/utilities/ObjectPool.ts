import { Object3D } from "three";

/**
 * Class for dynamically growing and shrinking a pool of objects based on a dataset
 * and addin them to a three.js object.
 */
export abstract class ObjectPool {
    pool: Object3D[];

    /**
     * Whether the created pool objects should be deleted immediately when
     * shrinking the pool or if they should just be removed and disposed
     * when calling `dispose`.
     * @member {boolean}
     * @default false
     */
    disposeImmediately: boolean = false;

    /**
     * Takes the Object3D to add all created pool objects to.
     * @param {Object3D} parent
     */
    constructor(public readonly parent: Object3D) {
        this.pool = [];
    }

    /**
     * Update the pool of objects based on the given data.
     * @param {Array} data
     * @returns {void}
     */
    updateData(data: Object3D[]): void {
        const { pool, parent, disposeImmediately } = this;

        // fill the pool up to data.length
        while (data.length > pool.length) {
            const obj = this.createObject();
            parent.add(obj);
            pool.push(obj);
        }

        if (disposeImmediately) {
            // dispose objects immediately if the flag is true
            while (pool.length > data.length) {
                const obj = pool.pop()!;
                parent.remove(obj);

                this.disposeObject(obj);
            }
        } else {
            // remove child objects if the pool is greater than the data length
            for (let i = data.length, l = pool.length; i < l; i++) {
                const obj = pool[i];
                if (obj.parent === null) {
                    break;
                } else {
                    parent.remove(obj);
                }
            }
        }

        for (let i = 0; i < data.length; i++) {
            const obj = pool[i];
            if (obj.parent === null) {
                parent.add(obj);
            }
            this.updateObject(pool[i], data[i]);
        }
    }

    /**
     * Disposes of all objects created in the pool.
     * @returns {void}
     */
    dispose() {
        const ogDispose = this.disposeImmediately;
        this.disposeImmediately = true;
        this.updateData([]);
        this.disposeImmediately = ogDispose;
    }

    /**
     * Called to create a new instance of the object to display when growing the pool.
     *
     * Must be implemented.
     *
     * @returns {Object3D}
     */
    abstract createObject(): Object3D;

    /**
     * Called to update object `object` based on the given data from the data array.
     *
     * Must be implemented.
     *
     * @param {Object3D} object
     * @param {any} data
     * @returns {void}
     */
    abstract updateObject(object: Object3D, data: any): void;

    /**
     * Fully dispose of the object that was created for the pool.
     *
     * Must be implemented.
     *
     * @param {Object3D} object
     * @returns {void}
     */
    abstract disposeObject(object: Object3D): void;
}
