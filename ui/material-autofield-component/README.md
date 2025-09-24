# Material Auto Field Component

A React component that automatically forms conforms to the appropriate input type of dropdown, slider, or string or numeric input field depending on the type of the passed value.

<!--{package-dependencies ./package.json}-->

# Use

```jsx
import { AutoField, AutoFieldList } from '@gov.nasa.jpl.honeycomb/material-autofield-component';

render() {

    const data = this.state.data;
    return (
        <div>
            <AutoField
                label="numeric"
                name="numeric"
                value={ data }
                options={ [ 1, 2, 3 ] }
                onChange={ e => setState( { data: e.target.value } ) }
            />
        </div>
    );

}
```

# Components

## AutoField

### value

```js
value : number | string | boolean
```

Value of the field.

### container

```js
container : Element
```

Click container element for the Material API.

### label

```js
label : string
```

The display label for the field.

### options

```js
options : Array | Object
```

The list of enumerated options to select for value.

### min

```js
min : number
```

The minimum value for a numeric field.

### max

```js
max : number
```

The maximum value for a numeric field.

### step

```js
step : number
```

The step for a numeric field.

### onChange

```js
onChange : Function
```

Fired when the field changes with the React event as an argument.

### style

```js
style : Object
```

The style field for the wrapper component.

### name

```js
name : string
```

The name of the field for differentiating fields in on change events.

### className

```js
className : string
```

The class name to put on the wrapper component.

## AutoFieldList

Takes an array of items and renders a list of AutoFields.

### items

```js
items : Array< Object >
```

Array of objects with fields that adhere to the [AutoField](#AutoField) props.

### container

```js
container : Element
```

Click container element for the Material API.

### style

```js
style : Object
```

The style field for the wrapper component of the [AutoFields](#AutoField).

### className

```js
className : string
```

The class name to put on the wrapper component of the [AutoFields](#AutoField).
