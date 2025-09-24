/* global runBenchmark */

import { FileCache } from '../src/FileCache';
import { serialize, deserialize } from '../src/utils';

{
    const cache = new FileCache();
    const largeArray = new Array(1000000).fill().map(() => Math.random() * 255);
    const largeUint8Array = new Uint8Array(largeArray);

    const obj = { arr: largeUint8Array };
    let index = 0;

    console.log('\tTyped Array');
    runBenchmark('\tFileCache.set', () => cache.set(index++, obj), 3000);

    cache.set('test', obj);
    runBenchmark('\tFileCache.get', () => cache.get('test'), 3000);
    cache.clear();

    runBenchmark('\tJSON.stringify', () => JSON.stringify(obj), 3000);

    const str = JSON.stringify(obj);
    runBenchmark('\tJSON.parse', () => JSON.parse(str), 3000);

    runBenchmark('\tserialize', () => serialize(obj), 3000);

    const res = serialize(obj);
    runBenchmark('\tdeserialize', () => deserialize(res.data, i => res.bin[i]), 3000);
}

{
    const cache = new FileCache();
    const largeArray = new Array(1000000).fill().map(() => Math.random() * 255);

    const obj = { arr: largeArray };
    let index = 0;

    console.log('\tNormal Array');
    runBenchmark('\tFileCache.set', () => cache.set(index++, obj), 3000);

    cache.set('test', obj);
    runBenchmark('\tFileCache.get', () => cache.get('test'), 3000);
    cache.clear();

    runBenchmark('\tJSON.stringify', () => JSON.stringify(obj), 3000);

    const str = JSON.stringify(obj);
    runBenchmark('\tJSON.parse', () => JSON.parse(str), 3000);

    runBenchmark('\tserialize', () => serialize(obj), 3000);

    const res = serialize(obj);
    runBenchmark('\tdeserialize', () => deserialize(res.data, i => res.bin[i]), 3000);

    runBenchmark('\tto Float64Array', () => new Float64Array(largeArray), 3000);
    runBenchmark(
        '\tto Float64Array Fast',
        () => {
            const arr = new Float64Array(largeArray.length);
            for (let i = 0, l = arr.length; i < l; i++) {
                arr[i] = largeArray[i];
            }
        },
        3000,
    );

    const f64 = new Float64Array(largeArray);
    runBenchmark('\tfrom Float32Array', () => Array.from(f64), 3000);
    runBenchmark(
        '\tfrom Float64Array Fast',
        () => {
            const arr = new Array(f64.length);
            for (let i = 0, l = f64.length; i < l; i++) {
                arr[i] = f64[i];
            }
        },
        3000,
    );
}

{
    const cache = new FileCache();
    const largeArray = new Array(1000000)
        .fill()
        .map(() => Math.random() * 255)
        .map(n => String.fromCharCode(n))
        .join('');
    const obj = { arr: largeArray };
    let index = 0;

    console.log('\tLarge String');
    runBenchmark('\tFileCache.set', () => cache.set(index++, obj), 3000);

    cache.set('test', obj);
    runBenchmark('\tFileCache.get', () => cache.get('test'), 3000);
    cache.clear();

    runBenchmark('\tJSON.stringify', () => JSON.stringify(obj), 3000);

    const str = JSON.stringify(obj);
    runBenchmark('\tJSON.parse', () => JSON.parse(str), 3000);

    runBenchmark('\tserialize', () => serialize(obj), 3000);

    const res = serialize(obj);
    runBenchmark('\tdeserialize', () => deserialize(res.data, i => res.bin[i]), 3000);
}
