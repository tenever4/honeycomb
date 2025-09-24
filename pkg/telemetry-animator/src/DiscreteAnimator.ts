import { Frame, StateBase } from '@gov.nasa.jpl.honeycomb/common';
import { TelemetryAnimator } from './TelemetryAnimator';
import { binarySearchFindFrame } from './utils';

/**
 * A general reusable animator that can draw discrete frames. These
 * are frames that are fully self describing and do not need to 'rolled'
 * or merged. There is no interpolation between frames and frames are selected
 * through a fast binary search.
 */
export class DiscreteTelemetryAnimator<T extends StateBase> extends TelemetryAnimator<T> {
    currentFrameIdx: number;

    constructor(frames?: Frame<T>[]) {
        super(frames);

        this.currentFrameIdx = -1;
    }

    get ready(): boolean {
        return true;
    }

    get startTime(): number {
        if (this.frames.length === 0) {
            return 0.0;
        }

        return this.frames[0].time;
    }

    get stopTime(): number {
        if (this.frames.length === 0) {
            return 0.0;
        }

        return this.frames[this.frames.length - 1].time;
    }

    /**
     * Trigger the animator to search for the current frame and dispatch
     * a 'change' event.
     */
    update() {
        this.currentFrameIdx = binarySearchFindFrame(this.frames, this.time);
        if (this.currentFrameIdx === -1) {
            // The current time is before any annotations exist
            this.state = <T>{};
        } else {
            this.state = this.frames[this.currentFrameIdx].state;
        }

        this.dispatchUpdate();
    }

    async setTime(time: number): Promise<void> {
        if (time === this.time) {
            return;
        }

        let needsUpdate = false;
        if (time > this.time) {
            // Check if there is a future frame
            if (this.frames.length === this.currentFrameIdx + 1) {
                // We are the most up to date we can be
                return;
            }

            // Check if we are still before the next frame
            if (time >= this.frames[this.currentFrameIdx + 1].time) {
                // We have entered a new frame
                needsUpdate = true;
            }
        } else if (this.currentFrameIdx >= 0) {
            // Check that we are still in the current frame
            if (time < this.frames[this.currentFrameIdx].time) {
                needsUpdate = true;
            }
        }

        this.time = time;
        if (needsUpdate) {
            this.update();
        }
    }

    mergeState(from: T, to: T): T {
        // Clear to
        for (const member in to) {
            delete to[member];
        }

        // Fill to
        for (const name in from) {
            to[name] = from[name];
        }

        return to;
    }
}