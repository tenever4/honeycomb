import { LiveAnimator } from '@gov.nasa.jpl.honeycomb/telemetry-animator';
import { JobRunner, Scheduler, BEFORE_ALL_PRIORITY } from '@gov.nasa.jpl.honeycomb/scheduling-utilities';

async function loadRosbag(paths, options) {
    const [
        { RosbagLoader },
        { RosMsgConverter },
        { BufferedKeyframeRosMessageAnimator },
    ] = await Promise.all([
        import('@gov.nasa.jpl.honeycomb/rosbag-loader'),
        import('@gov.nasa.jpl.honeycomb/ros-message-converter'),
        import('./RosMessageAnimator.js'),
    ]);

    const readers = await Promise.all(
        paths.map(p => {
            // set time scale to 1e-3 so times are read in and returned as seconds
            return new RosbagLoader().load(p, { timeScale: 1e-3, readAllData: false, ...options });
        }),
    );

    const BZipWorker = await import('./bzip2.worker.js').default;
    // Track all message readers to parse messages indivisually
    // TODO: Can the message definitions wind up being different between bags?
    // Should we hash based on message definition? How will blob/Blob know which
    // one to use?
    const converter = new RosMsgConverter();
    converter.initFromBags(...readers.map(r => r.handle));

    const allTopics = readers.map(reader => reader.topics).flat();
    const topics = options.topics
        ? options.topics.map(v => (v.name ? v.name : v)).filter(n => allTopics.includes(n))
        : allTopics;
    const types = Object.assign({}, ...readers.map(reader => reader.messageTypes));
    const startTime = Math.min(...readers.map(reader => reader.start));
    const endTime = Math.max(...readers.map(reader => reader.end));
    const topicOptions = {};
    options.topics.forEach(t => {
        if (t instanceof Object) {
            topicOptions[t.name] = t;
        } else {
            topicOptions[t] = {
                name: t,
                type: types[t],
            };
        }
    });

    const readerOptions = { topics, separateTopicArrays: false };
    const jobRunner = new JobRunner();
    jobRunner.maxJobs = 5;
    const anim = new BufferedKeyframeRosMessageAnimator(options);
    anim.setTopicsAndTypes(types);
    anim.startTime = startTime;
    anim.endTime = endTime;

    // TODO: understand how to make this more performant. Do these file reads asynchronously or on another thread, filter by topics, time, etc.
    anim.getFrames = function(time, duration) {
        const st = time;
        const ed = time + duration;

        const readersToUse = readers.filter(reader => {
            return st <= reader.end && ed > reader.start;
        });

        if (readersToUse.length === 0) {
            return Promise.resolve(null);
        } else {
            return jobRunner.run(async () => {
                const endTime = time + duration;
                const res = [];

                const framesArr = await Promise.all(
                    readersToUse.map(reader => reader.read(time, endTime, readerOptions)),
                );
                const promises = [];
                framesArr.forEach(f => {
                    for (let i = 0, l = f.length; i < l; i++) {
                        // convert the times to seconds
                        res.push(f[i]);

                        // TODO: This should be generalized for the blob/Blob case
                        const frame = f[i];
                        for (const key in frame.state) {
                            if (types[key] === 'blob/Blob') {
                                const state = frame.state[key];
                                const pr = new Promise(resolve => {
                                    const { compressed, data } = state;

                                    if (compressed) {
                                        const newArrayBuffer = data.slice(0, data.byteLength);
                                        const worker = new BZipWorker();
                                        worker.addEventListener('message', e => {
                                            resolve(e.data);
                                            worker.terminate();
                                        });
                                        worker.postMessage(newArrayBuffer, [newArrayBuffer.buffer]);
                                    } else {
                                        resolve(data);
                                    }
                                }).then(decompressedData => {
                                    decompressedData = decompressedData.buffer.slice(
                                        decompressedData.byteOffset,
                                        decompressedData.byteOffset + decompressedData.byteLength,
                                    );

                                    const targetType = topicOptions[key].targetType;
                                    if (converter.hasType(targetType)) {
                                        state.decompressedData = converter.convertFromType(targetType, decompressedData);
                                        state.decompressedType = targetType;
                                    } else {
                                        console.warn(
                                            `Rosbag Reader: Message from topic '${key}' could not be parsed because definition for '${targetType}' is not available.`,
                                        );
                                    }
                                });

                                promises.push(pr);
                            }
                        }
                    }
                });
                res.sort((a, b) => a.time - b.time);

                await Promise.all(promises);

                return res;
            });
        }
    };

    anim.generateKeyframes();

    return anim;
}

async function loadRosWebsocket(paths, options) {
    if (paths.length > 1) {
        throw new Error('ROS Listener does not support multiple urls.');
    }

    const [
        { RosbagLoader },
        { SmartTopic, RosMsgConverter },
        { RosMessageAnimator, BufferedKeyframeRosMessageAnimator },
    ] = await Promise.all([
        import('@gov.nasa.jpl.honeycomb/rosbag-loader'),
        import('@gov.nasa.jpl.honeycomb/ros-message-converter'),
        import('./RosMessageAnimator.js'),
    ]);

    // default options
    options = {
        autoReconnectInterval: 1000,
        buffer: 20,
        topics: [],
        seekable: true,
        ...options,
    };

    // create the animator first so we can return it and we don't block until the socket is connected
    let anim;
    let rosMessageAnim;
    if (options.seekable) {
        const liveAnim = new RosMessageAnimator([]);
        const cacheAnim = new BufferedKeyframeRosMessageAnimator(options);
        cacheAnim.buffer = options.buffer;

        anim = new LiveAnimator(liveAnim, cacheAnim);
        Object.defineProperties(anim, {
            messageTypes: {
                get() { return liveAnim.messageTypes; },
            },
            topics: {
                get() { return liveAnim.topics; },
            },
        });
        rosMessageAnim = liveAnim;

        // Make transformTracker available on the LiveAnimator because it's required for
        // the ROSDriver
        Object.defineProperty(anim, 'transformTracker', {
            value() {
                return anim.currAnimator.transformTracker;
            },
        });
    } else {
        anim = new RosMessageAnimator([]);
        anim.seekable = false;
        anim.nonSeekableBuffer = options.buffer;
        anim.liveData = true;
        anim.connected = false;
        rosMessageAnim = anim;
    }

    // return the latest time for endTime so it constantly ticks up instead of
    // just when data comes in
    Object.defineProperties(anim, {
        endTime: {
            get() {
                return window.performance.now() * 1e-3;
            },
        },
    });

    // register the ros topics and messages after the fact
    Scheduler.schedule(async () => {
        const ROSLIB = await import('roslib');
        const url = paths[0];
        const ros = new ROSLIB.Ros({ url });

        // initialize the ros socket to auto reconnect
        let disposed = false;
        const autoReconnectInterval = options.autoReconnectInterval;
        ros.on('warn', e => console.log('warn', e));
        ros.on('error', e => console.error('error', e));
        ros.on('close', e => {
            anim.dispatchEvent({ type: 'disconnected' });
            if (anim.connected) {
                anim.connectionChangeTime = new Date();
            }
            anim.connected = false;
            if (!disposed && autoReconnectInterval >= 0) {
                setTimeout(() => ros.connect(url), autoReconnectInterval);
            }
        });
        ros.on('connection', e => {
            anim.connected = true;
            anim.connectionChangeTime = new Date();
            anim.dispatchEvent({ type: 'connected' });
        });
        anim.addEventListener('dispose', () => {
            disposed = true;
            ros.close();
        });
        anim.connectionHost = url;

        const converter = new RosMsgConverter();
        await converter.initFromRos(ros);
        rosMessageAnim.setTopicsAndTypes(converter.types);

        // TODO: Are these frames coming in out of order? When blurring the player
        // and looking back it seems that we get a cache error where an object is inserted
        // twice. Do hiccups in framerate cause this?
        let frames = [];
        let anFrame = null;
        const addFrames = () => {
            anim.addFrames(frames);
            frames = [];
            anFrame = null;
        };

        for (const t of options.topics) {
            const { name, compression, addFrame, throttle_rate, type: messageType } = t;
            const smartTopicOptions = { 
                ros, name, converter, compression, throttle_rate, messageType,
            };

            if (throttle_rate) {
                console.log('Topic ' + name + ' will be throttled at ' + throttle_rate + 'ms');
            }

            // some topics, like /clock, require no compression, instead of the
            // default "cbor-raw" compression (see SmartTopic.js)
            if (smartTopicOptions.compression === undefined) delete smartTopicOptions.compression;

            const listener = new SmartTopic(smartTopicOptions);

            listener.numEmptyTfMessagesSeen = 0;
            listener.emptyTfConsoleMessageFunction = () => {
                console.warn(listener.numEmptyTfMessagesSeen + ' empty transforms message(s), skipping adding frame(s) to animator');
                listener.numEmptyTfMessagesSeen = 0;
            };
            
            listener.subscribe(msg => {
                let messageHasContent = true;
                if (name === '/tf' || name === '/tf_static') {
                    if (!Object.keys(msg.transforms).length) {
                        messageHasContent = false;
                        listener.numEmptyTfMessagesSeen++;
                        if (listener.numEmptyTfMessagesSeen === 1) {
                            setTimeout(listener.emptyTfConsoleMessageFunction, 1000);
                        }
                    } else {
                        RosbagLoader.indexTransformState(msg);
                    }
                }

                if (messageHasContent) {
                    // TODO: instead of using window.performance.now use the embedded
                    // timestamp and show / throw an error if we see an earlier time.
                    const time = window.performance.now() * 1e-3;
                    frames.push({
                        time,
                        state: {
                            [name]: msg,
                        },
                    });
    
                    // TODO: Handle blob/Blob decompression here as we do above
    
                    // Wait to gather all the available frames and then add them in the next frame
                    // because a ton can come in at once causing slowdowns otherwise.
                    if (!anFrame) {
                        anFrame = Scheduler.scheduleNextFrame(addFrames, BEFORE_ALL_PRIORITY);
                    }
                }
            });
        }
    });

    return anim;
}

async function loadRos(paths, options, manager) {
    const wsPaths = paths.filter(p => /^wss?:\/\//.test(p));
    if (wsPaths.length !== 0 && wsPaths.length !== paths.length) {
        throw new Error('Cannot mix rosbags and websockets');
    }

    if (wsPaths.length) {
        return loadRosWebsocket(paths, options);
    } else {
        return loadRosbag(paths.map(p => manager.resolveURL(p)), options);
    }
}

export { loadRos, loadRosWebsocket, loadRosbag };
