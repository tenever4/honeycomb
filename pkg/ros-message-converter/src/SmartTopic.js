import { Topic } from 'roslib';

/**
 * An extension of the ROSLIB.Topic that takes a {@link #RosMsgConverter RosMsgConverter} in the options
 * (as the "converter" option), uses "cbor-raw" compression by default, converts the result using
 * the provided converter, and infers the topic type based on the topic name.
 */
export class SmartTopic extends Topic {
    constructor(options) {
        if (!('converter' in options)) {
            throw new Error('SmartTopic: A converter must be provided.');
        }

        const converter = options.converter;
        let messageType = converter.getTopicType(options.name);
        let compression = 'compression' in options ? options.compression : 'cbor-raw';
        if ('compression' in options) {
            console.log('Using "' + compression + '" compression for topic ' + options.name);
        }
        if (!messageType) {
            messageType = options.messageType;
        } else if ('messageType' in options && options.messageType !== messageType) {
            console.warn(`SmartTopic: The provided type ${options.messageType} for topic ${options.name} will be replaced with an inferred type.`);
        }

        super({
            ...options,
            compression: compression,
            messageType: messageType,
        });

        this.converter = converter;
        this.wrappedFunctions = new WeakMap();
    }

    subscribe(callback) {
        const converter = this.converter;
        const wrappedCallback = function(msg) {
            if (this.compression === 'cbor-raw') {
                callback.call(this, converter.convertFromType(this.messageType, msg.bytes));
            } else {
                callback.call(this, msg);
            }
        };

        this.wrappedFunctions.set(callback, wrappedCallback);
        super.subscribe(wrappedCallback);
    }

    unsubscribe(callback) {
        const wrappedCallback = this.wrappedCallback.get(callback);
        if (wrappedCallback) {
            super.unsubscribe(wrappedCallback);
        }
    }

}
