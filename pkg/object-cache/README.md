# object-cache

A cache implementation that looks like a Javascript Map object but writes and reads to and from disk if running in a Node context. Otherwise a `Map` is used. When serializing an object with TypedArray instances, numeric arrays of length > 1e4, and strings of length > 1e4 to disk they are serialized and written to separately to retain JSON processing speed.

!> Note that as an optimization it is assumed that arrays are consistently typed. So if the first element is a number then all values in the array must be numbers otherwise there will be data loss when retrieving from the cache.

!> The object cache is not guaranteed to return a copy or new object when retrieving previously cached data. It may return the originally cached object.

!> The IndexedDBCache is untested because the test shim causes our docker tests to fail.

<!--{package-dependencies ./package.json}-->

# Use

```js
import { ObjectCache } from '@gov.nasa.jpl.honeycomb/object-cache';

const cache = new ObjectCache();
cache.set( 'key', { data: 1 } );

console.log( cache.get( 'key' ) );
// { data: 1 }

cache.delete( 'key' );
```

# API

## ObjectCache

The API mirrors the [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) API for `has`, `set`, `get`, `delete`, and `clear` and the constructor takes no arguments.
