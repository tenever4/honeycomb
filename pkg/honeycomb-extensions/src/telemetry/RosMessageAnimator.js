import {
    CustomTelemetryAnimator,
    KeyframeAnimatorMixin,
    BufferedAnimatorMixin,
    copyOnTo,
    isArrayBuffer,
} from '@gov.nasa.jpl.honeycomb/telemetry-animator';
import { RosTransformTracker } from '@gov.nasa.jpl.honeycomb/ros-transform-tracker';

const markerMerge = function(from, to, defaultMerge) {
    const ADD = 0;
    const DELETE = 2;
    const id = from.id;
    switch (from.action) {
        case ADD:
            to[id] = {};
            defaultMerge.call(this, from, to[id]);
            break;
        case DELETE:
            delete to[id];
            break;
    }

    return to;
};

const markerArrayMerge = function(from, to, defaultMerge) {
    const markers = from.markers;
    for (let i = 0, l = markers.length; i < l; i++) {
        markerMerge(markers[i], to, defaultMerge);
    }
    return to;
};

class RosMessageAnimator extends CustomTelemetryAnimator {
    constructor(frames) {
        super(frames);
        this.transformTracker = new RosTransformTracker();
        this.topics = [];
        this.messageTypes = {};
        this._needsPriorState = false;
    }

    setTopicsAndTypes(types) {
        // Sets the topics, types, and registers mergeMap functions for specially handled types
        const topics = Object.keys(types);
        const mergeMap = this.mergeMap;
        topics.forEach(topic => {
            switch (types[topic]) {
                case 'visualization_msgs/Marker':
                    mergeMap[topic] = markerMerge;
                    break;
                case 'visualization_msgs/MarkerArray':
                    mergeMap[topic] = markerArrayMerge;
                    break;
            }
        });

        this.topics = topics;
        this.messageTypes = types;
    }

    mergeState(from, to, mergeMap, tracker = this.transformTracker, applyPriorState = true) {
        // Ensure we read in the keyframe data if it's been loaded in that
        // has a lot of important fields in it.
        // TODO: Could this be handled more gracefully? With a keyframe update event?
        // TODO: could `this.state` just be `from`?
        if (applyPriorState && this._needsPriorState) {
            this._needsPriorState = false;
            const state = this.state;

            if ('/tf_static' in state) {
                tracker.applyMessage(state['/tf_static'], '/tf_static');
            }

            if ('/tf' in state) {
                tracker.applyMessage(state['/tf'], '/tf');
            }
        }

        const newFrom = {};
        copyOnTo(from, newFrom, this.traverseArrays, false, true);

        if ('/tf_static' in from) {
            tracker.applyMessage(from['/tf_static'], '/tf_static');
        }

        if ('/tf' in from) {
            tracker.applyMessage(from['/tf'], '/tf');
        }

        const stack = [newFrom];
        while (stack.length) {
            const obj = stack.pop();
            if (obj && !isArrayBuffer(obj)) {
                let keyCount = 0;
                for (const key in obj) {
                    keyCount++;
                }

                if ('seq' in obj && 'stamp' in obj && 'frame_id' in obj && keyCount === 3) {
                    // TODO: when a key frame is used this may be incorrect. It is
                    // important that other frames be used from before in order to
                    // derive the current position in space. There may have to be a
                    // special case for the rosbag animator keyframes that cause it
                    // to look back. With the ros websocket the position data will
                    // be cached.
                    // TODO: Cache the transforms used over a single function
                    // call in because in cases like "plan" the whole array of
                    // points gets a header.
                    // Note this happens most prominently when rewinding.
                    // Issue #383
                    obj.translation = obj.translation || {};
                    obj.rotation = obj.rotation || {};
                    obj.valid = tracker.getWorldPoseAtTime(
                        obj.frame_id,
                        obj.stamp,
                        obj.translation,
                        obj.rotation,
                    );
                } else {
                    for (const key in obj) {
                        if (typeof obj[key] === 'object' && key !== '/tf' && key !== '/tf_static') {
                            stack.push(obj[key]);
                        }
                    }
                }
            }
        }
        super.mergeState(newFrom, to, mergeMap);
    }

    _reset() {
        super._reset();
        if (this.transformTracker) {
            this.transformTracker.reset();
            this._needsPriorState = true;
        }
    }
}

// Version of RosMessageAnimator specifically for handling keyframes because it needs a special case of
// tracking and looking back in the transform tracker
class BufferedKeyframeRosMessageAnimator extends KeyframeAnimatorMixin(
    BufferedAnimatorMixin(RosMessageAnimator),
) {
    constructor(...args) {
        super(...args);
        this._keyframeTracker = null;
    }

    async generateKeyframes() {
        this._keyframeTracker = new RosTransformTracker();
        await super.generateKeyframes();
        this._keyframeTracker = null;
    }

    mergeStateForKeyframes(from, to) {
        return this.mergeState(from, to, this.mergeMap, this._keyframeTracker, false);
    }
}

export { RosMessageAnimator, BufferedKeyframeRosMessageAnimator };
