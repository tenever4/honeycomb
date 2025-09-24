# mixin-shaders

Set of mixin function and shader composition utilities for to extending and modifying three.js materials.

<!--{package-dependencies ./package.json}-->

# Use

```js
import { ShaderLib } from 'three';
import { Mixins, ExtendedShaderMaterial } from '@gov.nasa.jpl.honeycomb/mixin-shaders';

const TopoStandardMaterial =
    ExtendedShaderMaterial.createClass(
        ShaderLib.standard,
        [
            Mixins.SteepnessShaderMixin,
            Mixins.TopoLineShaderMixin,
        ]
    );
const material = new TopoStandardMaterial();
material.ENABLE_TOPO_LINES = 1;
material.topoLineColor.set( 0xff0000 );

```

# API

## Mixins

Set of functions that modify existing shader definitions to add in effects. Every mixin adds shader uniforms and a `DEFINE` keyword that defaults to 0 to toggle and change the effect.

### GridClipMixin

```js
GridClipMixin( shader : Shader ) : Shader
```

Clips the material into a grid.

**Define**

`ENABLE_GRID_CLIP`

**Uniforms**

```js
{
    // the width of one grid cell in world units
    gridSize = 1 : number,

    // the thickness of grid lines in world units
    gridThickness = 0.1 : number,

    // where the "center" of the grid should begin
    gridOffset = 0, 0, 0 : Vector3
}
```

### ClipPlaneMixin

```js
ClipPlaneMixin( shader : Shader ) : Shader
```

Discards fragments on the positive side of the plane.

**Define**

`ENABLE_CLIP_PLANE`

**Uniforms**

```js
{
    // a vector representing the plane where the xyz component is
    // the normal and w is the distance
    clipPlane = 0, 1, 0, 0 : Vector4,
}
```

### SteepnessShaderMixin

```js
SteepnessShaderMixin( shader : Shader ) : Shader
```

Colors fragments that are above a certain slope relative to the "up" vector. Works best when `flatShading` is enabled.

**Define**

`ENABLE_STEEPNESS_VISUALIZATION`

**Uniforms**

```js
{
    // the color to tint the fragments
    steepnessColor = 0, 0, 0 : Color,

    // the threshold above which to color the fragments where
    // 1 is up (or down) and 0 is horizontal
    maxSteepness = 0.5 : number
}
```

### SteepnessClipShaderMixin

```js
SteepnessClipShaderMixin( shader : Shader ) : Shader
```

Clips fragments that are above a certain steepness threshold relative to a provided vector.

**Define**

`ENABLE_STEEPNESS_CLIP`

**Uniforms**

```js
{
    // the threshold below which to color the fragments where
    // 1 is along the steepnessClipVector and 0 is perpendicular
    steepnessClip = 0.001 : number,

    // the vector along which to check the steepness
    steepnessClipVector = 0, 1, 0 : Vector3
}
```

### TopoLineShaderMixin

```js
TopoLineShaderMixin( shader : Shader ) : Shader
```

Effect that adds topographic lines to the surface of a material.

**Define**

`ENABLE_TOPO_LINES`

**Uniforms**

```js
{
    // the color to make the lines
    topoLineColor = 0, 0, 0 : Color,

    // the thickness factor for the lines. This does not correspond
    // to world units.
    topoLineThickness = 0.005 : number

    // how far apart to space the lines in world units.
    topoLineSpacing = 0.1 : number

    // how far to offset the topo lines from 0.
    topoLineOffset = 0 : number

    // how often to emphasize a topographic line. Non-emphasized lines
    // will disappear once the camera tracks too far away.
    topoLineEmphasisMod = 10 : number
}
```

### ColorRampShaderMixin

```js
ColorRampShaderMixin( shader : Shader ) : Shader
```

Effect that adds a color gradient from one y position to another.

**Define**

`ENABLE_COLOR_RAMP`

**Uniforms**

```js
{
    // the color to use for the color ramp
    rampColor = 0, 0, 0 : Color,

    // the world y position to start the ramp at
    rampMin = 0 : number

    // the world y position to end the ramp at
    rampMax = 1 : number
}
```

### DitheredTransparencyShaderMixin

```js
DitheredTransparencyShaderMixin( shader : Shader ) : Shader
```

Effect that adds clip transparency to avoid transparent object overdraw and draw order artifacts.

**Define**

`ENABLE_DITHER_TRANSPARENCY`

**Uniforms**

```js
{
    // texture used compare alpha to and discard pixels. Defaults to a
    // dither pattern texture.
    ditherTex : Texture
}
```

### PerturbedFilterShaderMixin

```js
PerturbedFilterShaderMixin( shader : Shader ) : Shader
```

TODO

### BinnedPointsMixin

```js
BinnedPointsMixin( shader : Shader ) : Shader
```

Effect that bins and renders points as cubes in a voxelized fashion. This shader expects that the geometry is being rendered is an instanced cube with `instance_position` being provided for point positions.

**Define**

`BINNED_POINTS`

**Uniforms**

```js
{
    // The size of the voxelized space and width of the cubes
    binnedPointsScale = 1 : number,

    // the offset of the voxelized space
    binnedPointsOffset = 0, 0, 0 : Vector3
}
```

## ExtendedShaderMaterial

_extends [ShaderMaterial](https://threejs.org/docs/#api/en/materials/ShaderMaterial)_

A `ShaderMaterial` wrapper that exposes are `uniforms` as member variables of the material instance and `defines` is a Proxy object that will automatically mark the material as needing an update when one changes.

### .createClass

_static_

```js
createClass( base : Shader, mixinList : Array<Function> ) : Class
```

Takes a shader and a list of [mixin functions](#Mixins) to apply to the shader. A class definition based on ExtendedShaderMaterial is returned to instantiate the material. The returned class defintion has a constructor that only takes `options`.

### constructor

```js
constructor( definition : Shader, options : Object )
```

Takes a shader definition to use for the shader as `definition` and a set of default shader options as `options`.
