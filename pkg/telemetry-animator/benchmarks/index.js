/* global runBenchmark */
import {
    TelemetryAnimator,
    NestedTelemetryAnimator,
    CustomTelemetryAnimator,
} from '../src/index';

const simpleFrames = new Array(10000).fill().map((el, i) => ({ time: i, state: { item: i } }));
const flatFrames = new Array(10000).fill().map((el, i) => {
    const res = { time: i, state: {} };
    for (let j = 0; j < 100; j++) {
        res.state[`item-${j}`] = i;
    }
    return res;
});

function recurseState(width, depth) {
    const res = {};
    for (let j = 0; j < width; j++) {
        res[`item-${j}`] = depth === 0 ? j : recurseState(width, depth - 1);
    }
    return res;
}

const state = recurseState(5, 2);
const nestedFrames = new Array(10000).fill().map((el, i) => {
    const res = { time: i, state };
    return res;
});

console.log('\tSimple state');
runBenchmark(
    '\tTelemetryAnimator',
    () => {
        new TelemetryAnimator(simpleFrames).setTime(Infinity);
    },
    3000,
);

runBenchmark(
    '\tNestedTelemetryAnimator',
    () => {
        new NestedTelemetryAnimator(simpleFrames).setTime(Infinity);
    },
    3000,
);

runBenchmark(
    '\tCustomTelemetryAnimator',
    () => {
        new CustomTelemetryAnimator(simpleFrames).setTime(Infinity);
    },
    3000,
);

console.log('\tFlat state');
runBenchmark(
    '\tTelemetryAnimator',
    () => {
        new TelemetryAnimator(flatFrames).setTime(Infinity);
    },
    3000,
);

runBenchmark(
    '\tNestedTelemetryAnimator',
    () => {
        new NestedTelemetryAnimator(flatFrames).setTime(Infinity);
    },
    3000,
);

runBenchmark(
    '\tCustomTelemetryAnimator',
    () => {
        new CustomTelemetryAnimator(flatFrames).setTime(Infinity);
    },
    3000,
);

console.log('\tNested state');
runBenchmark(
    '\tTelemetryAnimator',
    () => {
        new TelemetryAnimator(nestedFrames).setTime(Infinity);
    },
    3000,
);

runBenchmark(
    '\tNestedTelemetryAnimator',
    () => {
        new NestedTelemetryAnimator(nestedFrames).setTime(Infinity);
    },
    3000,
);

runBenchmark(
    '\tCustomTelemetryAnimator',
    () => {
        new CustomTelemetryAnimator(nestedFrames).setTime(Infinity);
    },
    3000,
);
