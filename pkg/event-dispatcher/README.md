# event-dispatcher

A copy of the three.js `EventDispatcher` class to help separate dependencies from three. See the [EventDispatcher docs](https://threejs.org/docs/#api/en/core/EventDispatcher) for more information.

!> It's important to note that while the the API mimics the the browsers `EventTarget` api events are dispatched _immediately_ instead of waiting until the end of the frame.
