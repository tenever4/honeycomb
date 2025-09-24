/* global runBenchmark */
import { TagTracker, compileExpression } from '../src/TagTracker';

const manyTags = new TagTracker();
const manyObjects = new TagTracker();

const expr = compileExpression('a && a && !b');
const obj = {};
new Array(10000).fill().forEach((el, i) => {
    manyTags.addTag(obj, i);
    manyObjects.addTag({}, 'a');
});

console.log('\tTracker with many tags');
runBenchmark(
    '\tDynamically compiling an expression.',
    () => manyTags.getObjects('a && a && !b'),
    3000,
);

runBenchmark('\tPrecompiled expression.', () => manyTags.getObjects(expr), 3000);

console.log('\tTracker with many objects.');
runBenchmark(
    '\tDynamically compiling an expression.',
    () => manyObjects.getObjects('a && a && !b'),
    3000,
);

runBenchmark('\tPrecompiled expression.', () => manyObjects.getObjects(expr), 3000);
