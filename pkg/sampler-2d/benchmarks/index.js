/* global runBenchmark */
import {
    Sampler2D,
    SpatialSampler2D,
} from '../src/index';

const width = 1000;
const height = 1000;
const sampler = new Sampler2D(new Uint8Array(2 * width * height), width, 2);
const spatialSampler = new SpatialSampler2D(new Uint8Array(2 * width * height), width, 2);
const target = new Array(2);
const ITERATIONS = 100000;

console.log('\tInterpolate === true');
sampler.interpolate = true;
spatialSampler.interpolate = true;
runBenchmark(
    '\tsamplePixelChannel',
    () => {
        for (let i = 0; i < ITERATIONS; i ++) sampler.samplePixelChannel(0, 0, 0);
    },
    3000,
);

runBenchmark(
    '\tsamplePixel',
    () => {
        for (let i = 0; i < ITERATIONS; i ++) sampler.samplePixel(0, 0, target);
    },
    3000,
);

runBenchmark(
    '\tsampleChannel',
    () => {
        for (let i = 0; i < ITERATIONS; i ++) sampler.sampleChannel(0.5, 0.5, 0);
    },
    3000,
);

runBenchmark(
    '\tsample',
    () => {
        for (let i = 0; i < ITERATIONS; i ++) sampler.sample(0.5, 0.5, target);
    },
    3000,
);

runBenchmark(
    '\tspatialSampleChannel',
    () => {
        for (let i = 0; i < ITERATIONS; i ++) spatialSampler.spatialSampleChannel(0.5, 0.5, 0);
    },
    3000,
);

runBenchmark(
    '\tspatialSample',
    () => {
        for (let i = 0; i < ITERATIONS; i ++) spatialSampler.spatialSample(0.5, 0.5, target);
    },
    3000,
);


console.log('\tInterpolate === false');
sampler.interpolate = false;
spatialSampler.interpolate = false;
runBenchmark(
    '\tsamplePixelChannel',
    () => {
        for (let i = 0; i < ITERATIONS; i ++) sampler.samplePixelChannel(0, 0, 0);
    },
    3000,
);

runBenchmark(
    '\tsamplePixel',
    () => {
        for (let i = 0; i < ITERATIONS; i ++) sampler.samplePixel(0, 0, target);
    },
    3000,
);

runBenchmark(
    '\tsampleChannel',
    () => {
        for (let i = 0; i < ITERATIONS; i ++) sampler.sampleChannel(0.5, 0.5, 0);
    },
    3000,
);

runBenchmark(
    '\tsample',
    () => {
        for (let i = 0; i < ITERATIONS; i ++) sampler.sample(0.5, 0.5, target);
    },
    3000,
);

runBenchmark(
    '\tspatialSampleChannel',
    () => {
        for (let i = 0; i < ITERATIONS; i ++) spatialSampler.spatialSampleChannel(0.5, 0.5, 0);
    },
    3000,
);

runBenchmark(
    '\tspatialSample',
    () => {
        for (let i = 0; i < ITERATIONS; i ++) spatialSampler.spatialSample(0.5, 0.5, target);
    },
    3000,
);
