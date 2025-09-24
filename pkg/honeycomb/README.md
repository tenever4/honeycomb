# Honeycomb

Core classes and helper to support instantiating a Honeycomb viewer with telemetry and drivers.

<!--{package-dependencies ./package.json}-->

# Utilities

## Config

```js
{
    root: string | null,
    title: string,

    robots: Array< {

        id: string,
        type: null | string,
        path: string,
        options: Object

    } >,

    terrain: Array< {

        id: string,
        type: null | string,

        path: null | string,
        paths: null | Array<string>,

        options: Object

    } >,

    telemetry: Array< {

        id: string,
        type: string,

        path: null | string,
        paths: null | Array<string>,

        options: Object

    } >,

    drivers: Array< {

        id: string,
        type: string,

        options: Object

    } >,

    charts: Array< {
        animator: string,
        units: string,
        relative: boolean,
        labels: Array<string>,
        fields: Array<Array<string>>,
        duration: number
    } >,

    options: {

        renderer: Object,
        up: string,
        secondsFactor: number,
        playbackSpeed: number,
        displayAbsoluteTime: boolean,
        baseTimeFormat: string,
        settings: Array< {

            label: string,
            tag: string,
            default: boolean,
            shortcut: string,
            lockable: boolean

        } >

    }

}
```

### load

```js
load( path : string ) : Promise<Object>
```

Loads an normalizes a Honeycomb config file from the given path. If the config inherits from a "root" path then the configs are recursively loaded and merged.

### clean

```js
clean( config : Object, basePath = '' : string ) : Object
```

Cleans the given config file and unpacks all file paths in the `terrain`, `robots`, and `telemetry` fields to be relative to the given `basePath` variable.

### merge

```js
merge( ...configs : Object ) : Object
```

Deep merges the configs from left to right to apply config deltas on top of another. Objects are deep merged while arrays are concatenated.

## Loaders

Registration functions for loading 3d models, telemetry, and drivers so files can be easily loaded and processed by external applications and the config files.

### registerModelLoader

```js
registerModelLoader(
    extension : string | Array<string>,
    cb : ( path : string, options : Object, manager : LoadingManager )
        => Promise<Object3D>
) : void
```

Register a callback that will load, process, and return a 3d model file. The callback takes the url to the file, a set of options to load the file, and a [LoadingManager](https://threejs.org/docs/#api/en/loaders/managers/LoadingManager) which can be used to track dependent file loading.

### loadModel

```js
loadModel( path : string, options : Object, manager = null : LoadingManager ) : Promise<Object3D>
```

Loads and parses the 3d model at the given path. Uses the file extension and picks the appropriate registered model loader.

### registerTelemetryAnimatorLoader

```js
registerTelemetryAnimatorLoader(
    type : string | Array<string>,
    cb : ( path : string, options : Object )
        => Promise<TelemetryAnimator | Object>
) : void
```

Like [registerModelLoader](#registerModelLoader) but for `TelemetryAnimators` and telemetry files. A `TelemetryAnimator` is expected to be returned or an object od named TelemetryAnimators.

### loadTelemetryAnimator

```js
loadTelemetryAnimator( type : string, path : string, options : Object ) : Promise<TelemetryAnimator | Object>
```

Parses the file at the given path using the loader registered for the type.

### registerDriver

```js
registerDriver( type : string, class : DriverClass ) : void
```

Registers a [Driver](#Driver) with a given name.

### createDriver

```js
createDriver( type : string, options : Object ) : Driver
```

Intantiates and returns a Driver of the given type.

# Core

## ViewerMixin

### .animator

```js
animator : JoinedTelemetryAnimator
```

The `JoinedTelemetryAnimator` that manages and keeps in sync all data animators.

### .animators

```js
animators : { [ key ] : TelemetryAnimator }
```

The set of animators in [animator](#.animator). An alias to `animator.animators`.

### .tags

```js
tags : TagTracker
```

A tag manager that can be used to add and track tags for objects. Tags are automatically added for robots and terrain.

### .isPlaying

```js
isPlaying = false : Boolean
```

Whether or not the animator is being animated.

### .isLive

```js
isLive = false : Boolean
```

Whether or not the animator is displaying live data as it comes in.

### .playbackSpeed

```js
playbackSpeed = 1 : Number
```

The playback for the animator.

### addAnimator, getAnimator, removeAnimator

```js
addAnimator( animator : Animator, id : string ) : void
getAnimator( id : string ) : void
removeAnimator( id : string ) : void
```

API for adding a removing an animator from the set of used telemetry.

### addRobot, getRobot, removeRobot

```js
addRobot( robot : URDFRobot, id : string ) : void
getRobot( id : string ) : void
removeRobot( id : string ) : void
```

API for adding and removing robots from the system.

### addTerrain(terrain, id) / getTerrain(id) / removeTerrain(id)

```js
addTerrain( terrain : Object3D, id : string ) : void
getTerrain( id : string ) : void
removeTerrain( id : string ) : void
```

API for adding and removing terrain from the system.

### addDriver, getDriver, removeDriver

```js
addDriver( driver : Driver, id : string ) : void
getDriver( id : string ) : void
removeDriver( id : string ) : void
```

API for adding and removing drivers.

### play

```js
play() : void
```

Start playing the animator. If `isLive` is true the time will always jump to the latest data.

### pause

```js
pause() : void
```

Pauses the animator at the current time. Sets `isLive` and `isPlaying` to false.

### stop

```js
stop() : void
```

Pauses the animator and sets it to the initial time of the animator.

## LoadingManager

_inherits from THREE.LoadingManager and EventDispatcher_

Similar class to three.js' LoadingManager that can bubble item start, progress, load, and error calls up to a parent LoadingManager as well as dispatch events. `start`, `complete`, `progress`, and `error` events are dispatched.


### manager

```js
manager = null : LoadingManager
```

The parent loading manager.

### constructor

```js
constructor( manager : LoadingManager, onStart, onProgress, onLoad, onError )
```

Takes another manager which the item start and end calls are bubbled up to so child load managers can be tracked.

<!-- START_AUTOGENERATED_DOCS -->
## StateDiff

A class for tracking and checking the difference between two objects and whether or
not a file path has changed.

### initialObject<a name="StateDiff#initialObject"></a>

```js
initialObject : null = false
```



### update<a name="StateDiff#update"></a>

```js
update( from : Object, to : Object ) : void
```

Updates the StateDiff object to store and check the differences between the two objects.

### didChange<a name="StateDiff#didChange"></a>

```js
didChange( tokens : ...string ) : Boolean
```

Takes a list of tokens representing the recursive object keys to test. If a field has been added,
removed, or changed between the two objects being diffed then "true" will be returned.

## Driver

The Driver class is the interpreter of data to visualizations. It takes a set of options and is attached
to a viewer to add visualizations into. When data is changed the "update" function is called either from
viewer or manually to update the display of the annotations.

### options<a name="Driver#options"></a>

```js
options : Object
```


The set of options passed into the constructor used for updating the driver.


### manager<a name="Driver#manager"></a>

```js
manager : LoadingManager
```


The manager passed into the constructor useful for resolving file paths for assets that need to be loaded.


### viewer<a name="Driver#viewer"></a>

```js
viewer : Viewer
```


The viewer this driver has been attached to.


### updateOrder<a name="Driver#updateOrder"></a>

```js
updateOrder : Number
```


The order in which this driver will be updated relative to other drivers by the viewer.


### constructor

```js
constructor( options : Object = {}, manager : LoadingManager = new SubLoadingManager() ) : void
```

### setState<a name="Driver#setState"></a>

```js
setState( state : Object, diff : StateDiff = ALL_CHANGED_DIFF ) : void
```

The function to call when adjusting the state that should be visualized.

### forceUpdate<a name="Driver#forceUpdate"></a>

```js
forceUpdate(  ) : void
```

The function to call to force a rerun of "update" with a diff indicating everything in the state has changed.
This can be used if member variables or options not represented in the state are adjusted and impact visualizations.

### initialize<a name="Driver#initialize"></a>

_overrideable_

```js
initialize(  ) : void
```

Not intended to be called manually. This function should be overridden by a Driver implementation and is called when a
driver has been added to a Viewer.

### update<a name="Driver#update"></a>

_overrideable_

```js
update( state : Object, diff : StateDiff ) : void
```

Not intended to be called manually. This function should be overridden by a Driver implementation and is called when a
drivers state has been updated or a force update has been made.

### dispose<a name="Driver#dispose"></a>

_overrideable_

```js
dispose(  ) : void
```

Not intended to be called manually. This function should be overridden by a Driver implementation and is called when a
viewer is being disposed of or the drive is removed from a viewer.


<!-- END_AUTOGENERATED_DOCS -->
