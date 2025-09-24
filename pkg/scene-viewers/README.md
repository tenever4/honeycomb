# scene-viewers

Set of classes and mixins for creating a basic three.js viewer with convenience functions.

<!--{package-dependencies ./package.json}-->

# Use

## Basic Viewer

```js
import { Viewer } from '@gov.nasa.jpl.honeycomb/scene-viewers';

const viewer = new Viewer();
document.body.appendChild( viewer.domElement );
```

## Dirty Viewer

```js
// TODO
```

## Label Viewer

```js
// TODO
```

## Optimized Viewer

```js
// TODO
```

# API

## ViewerOptions

The options for the viewer. All options for the [WebGLRenderer](https://threejs.org/docs/#api/en/renderers/WebGLRenderer) are valid.

### .showStats

```js
showStats = false : boolean
```

Whether or not to init stats with the viewer.

## Viewer

_extends [EventDispatcher](../event-dispatcher/README.md)_

Wraps and sets up the three.js WebGLRenderer and implements a render loop.

### Events

`before-render`

Fired before a frame is rendered.

`after-render`

Fired after a frame is rendered.

`enabled`

Fired when the viewer is enabled.

`disabled`

Fired when the viewer is disabled.

`added`

Fired whenever an object is added anywhere in the scene. The child is available on the `child` field of the event.

`removed`

Fired whenever an object is removed anywhere in the scene. The child is available on the `child` field of the event.

### .domElement

```js
domElement : CanvasElement
```

A handle to the domElement from the [WebGLRenderer](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.domElement).

### .renderer

```js
renderer : WebGLRenderer
```

A handle to the [WebGLRenderer](https://threejs.org/docs/#api/en/renderers/WebGLRenderer).

### .enabled

```js
enabled = true : boolean
```

Whether or not to render the scene. If `false` the scene will not be rendered.

### .scene

```js
scene : Scene
```

A handle to [Scene](https://threejs.org/docs/#api/en/objects/Scene) being rendered.

### .world

```js
world : Group
```

A child object of [scene](#.scene) with rotations applied to adjust the scenes "up", as defined by the [setUp](#.setUp) function.

### .orthographic

```js
orthographic = false : boolean
```

Whether to render the scene using an orthographic camera or not.

### .perspectiveCamera

```js
perspectiveCamera : PerspectiveCamera
```

The camera used to render the scene when [.orthographic](#.orthographic) is `false`.

### .orthographicCamera

```js
orthographicCamera : OrthographicCamera
```

The camera used to render the scene when [.orthographic](#.orthographic) is `true`. This camera is synced with the position, rotation, and zoom of [.perspectiveCamera](#.perspectiveCamera) before rendering. It can be manually updated using the [syncCameras](#syncCameras) function.

### .composer

```js
composer : EffectComposer
```

### .resolution

```js
resolution : Vector2
```

The resolution of the current display. The size of the renderer is not updated automatically on window resize. [setSize](#.setSize) must be called.

### .getCamera

```js
getCamera() : PerspectiveCamera | OrthographicCamera
```

Returns the currently active camera based on the value of [.orthographic](#.orthographic).

### .gridVisibility

```js
gridVisibility = false : Boolean
```

Whether or not to display a floor grid in the world at the origin.

### .syncCameras

```js
syncCameras() : void
```

Updates the orthographic camera to be in sync with the position, rotation, and zoom of the perspective camera and vice versa.

### .setSize

```js
setSize( width : number, height : number ) : void
```

Sets the resolution of the rendered canvas.

### .setTargetScale

```js
setTargetScale( scale : number ) : void
```

Sets the render multiplier ratio, which can be used for manual super sample antialiasing (or lowering the resolution to improve performance).

### .setPixelRatio

```js
setPixelRatio( pixelRatio : number ) : void
```

Sets the pixel ratio of the renderer. See [WebGLRenderer.setPixelRatio](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setPixelRatio).

### .initStats

```js
initStats() : void
```

Intializes a framerate display on the page.

## DirtyViewerMixin

A function that adds behavior for rendering only on scene changes. The class is expected to inherit from [Viewer](#Viewer]).

### .dirty

```js
dirty = false : boolean
```

Marks the viewer as dirty and schedules a draw for the next frame if set to true. It is expected that this is set to true when something in the scene is changed.

### .staticRender

_overrideable_

```js
staticRender(
    renderer : WebGLRenderer,
    scene : Scene,
    camera : Camera,
    iteration : number
) : boolean
```

Called for subsequent frames after a fresh draw has been made until the function returns false. `iteration` is incremented for every frame after the original draw is done.

This can be used to progressively draw new data on top of the canvas while the scene isn't updating.

## LabelLayerMixin

A function that adds behavior for displaying HTML dom element labels on top of 3d objects. The class is expected to inherit from [Viewer](#Viewer]).

A div layer is added on top of the canvas for housing the labels. A label is added to the scene by creating an instance of an object that adhere's to the following interface and adding it to the scene:

```js
class extends Object3D {

    isLabel = true : boolean;
    label : DomElement;
    updateLabelPosition( renderer : WebGLRenderer, scene : Scene, camera : Camera ) : void;

}
```

The `label` element is added to the view layer and is expected to update it's position based on the objects projection relative to the camera when `updateLabelPosition` is called.

## OptimizedViewerMixin

A function that adds behavior for incrementally optimizing the performance of the 3d viewer and adds the [FXAAPass]() and [BloomPass]() screen effects by default.

The BloomPass and FXAAPass will be incrementally made more performant or disabled until the target framerate of at least 35 is reached. The render resolution will also be incrementally updated.

### .optimizer

```js
optimizer : Optimizer
```

The Optimizer instance from [framerate-optimizer](https://github.com/gkjohnson/js-framerate-optimizer/) package.

<!-- START_AUTOGENERATED_DOCS -->
## World

_extends Group_

### Events

`orientation-changed`

Fired whenever the up direction is changed.

### getUpDirection<a name="World#getUpDirection"></a>

```js
getUpDirection(  ) : String
```

Returns the up direction of the world object in the form of [+-][XYZ].

### setUpDirection<a name="World#setUpDirection"></a>

```js
setUpDirection( upString : String ) : void
```

Takes the up axis orientation as a string in the form of [+-][XYZ].


<!-- END_AUTOGENERATED_DOCS -->
