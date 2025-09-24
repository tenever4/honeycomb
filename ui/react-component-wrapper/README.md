# React Component Wrapper

Wrapper class to make it easier to use React components without JSX.

<!--{package-dependencies ./package.json}-->

# Use

```jsx
import { ReactComponentWrapper } from '@gov.nasa.jpl.honeycomb/react-component-wrapper';
import ReactComponent from 'sample-react-component';

const app = new ReactComponentWrapper( ReactComponent, { /* props */ } );
document.body.appendChild( app.container );
```

# API

## ReactComponentWrapper

### static .wrap

```js
static wrap( tag : Component.prototype ) : ReactComponentWrapper.prototype
```

Returns a class definition based on [ReactComponentWrapper](#ReactComponentWrapper) that only instantiates a component with the given React Component `tag`. The constructor only takes props and a container.

### .container

```js
readonly container : Element
```

The container the component renders in to.

### .tag

```js
readonly tag : Component.prototype
```

The tag that is rendered.

### constructor

```js
constructor(
    tag : Component.prototype,
    props = {} : Object,
    container = document.createElement( 'div' ) : Element
)
```

Creates an instance of the class that will render a component of type `tag` into `container` with `props` supplied.

### .update

```js
update( props : Object ) : void
```

Rerenders the element with the new provided props.

?> NOTE: The properties are not automatically merged.

### .unmountFromContainer

```js
unmountFromContainer() : void
```

Unmounts the rendered component from the container.
