import { parse as parseMessageDefinition } from '@foxglove/rosmsg';
import { MessageReader } from '@foxglove/rosmsg-serialization';

/**
 * Class for tracking ROS Topic, types, and definitions and converting binary "cbor-raw"
 * representations to javascript objects.
 */
export class RosMsgConverter {
    constructor() {
        /**
         * @member {Boolean}
         * @description Boolean indicating whether or not the instance has been
         * initialized and ready to use.
         */
        this.ready = false;

        /**
         * @member {Object}
         * @description A map of topic name to the name of the type.
         */
        this.types = null;
        this.readers = null;
    }

    /**
     * Initialializes the types asynchronously using a ROSLIB.ROS instance by fetching the
     * topics and raw message definitions message.
     * @param {ROSLIB.ROS} handle
     */
    initFromRos(handle) {
        return new Promise((resolve, reject) => {
            handle.getTopicsAndRawTypes(result => {
                const readers = {};
                const types = {};
                for (let i = 0, l = result.topics.length; i < l; i ++) {
                    const topic = result.topics[ i ];
                    const type = result.types[ i ];
                    const typeDef = result.typedefs_full_text[ i ];

                    types[ topic ] = type;
                    if (!(type in readers)) {
                        readers[ type ] = new MessageReader(parseMessageDefinition(typeDef));
                    }
                }

                console.log('Successfully initialized Ros Message Converter', types);

                this.types = types;
                this.readers = readers;
                resolve();
            }, reject);
        });
    }

    /**
     * Takes a list of initialized rosbag package "Bag" instances to initializes the class with.
     * @param  {...Bag} handles
     */
    initFromBags(...handles) {
        const types = {};
        const readers = {};

        handles.forEach(handle => {
            const connections = Array.from(handle.connections.values());
            connections.forEach(connection => {
                const {
                    topic, type, messageDefinition,
                } = connection;
                types[topic] = type;

                if (!(type in readers)) {
                    readers[ type ] = new MessageReader(parseMessageDefinition(messageDefinition));
                }
            });
        });

        this.types = types;
        this.readers = readers;
    }

    /**
     * Returns whether the converter can handle the given type.
     * @param {string} type
     * @returns {Boolean}
     */
    hasType(type) {
        return type in this.readers;
    }

    /**
     * Converts the binary data to a javascript object using the reader of the given type.
     * @param {string} type
     * @param {ArrayBuffer} data
     * @returns {Object}
     */
    convertFromType(type, data) {
        if (!this.readers[type]) {
            console.error('Need to reconnect to ROS, could not find message converter for type ' + type);
            return {};
        }
        return this.readers[type].readMessage(data);
    }

    /**
     * Converts the binary data to a javascript object using the reader of the type of the given topic.
     * @param {string} topic
     * @param {ArrayBuffer} data
     * @returns {Object}
     */
    convertFromTopic(topic, data) {
        return this.readers[this.types[topic]].readMessage(data);
    }

    /**
     * Returns the type associated with the given topic.
     * @param {string} topic
     * @returns {string}
     */
    getTopicType(topic) {
        return this.types[topic];
    }
}
