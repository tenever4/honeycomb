import React, { useCallback, useEffect, useState } from "react";
import { Object3D } from "three";

import { EventWatcher } from "../../components/EventWatcher";

import { useHoneycomb } from "../../components/Honeycomb/HoneycombContext";
import {
    HoneycombPanelOptions,
} from "../../types";

import { Annotation, LoadingManager, Scene, SceneObject, SceneObjectType, Viewer } from "@gov.nasa.jpl.honeycomb/core";
import { ObjectLoader, useObjectLoader } from "../ObjectLoader";
import { SceneFrameLoader } from "./SceneFrameLoader";
import { SceneModelLoader } from "./SceneModelLoader";
import { SceneAnnotationLoader } from "./SceneAnnotationLoader";
import { Label2D } from "../Honeycomb/Label2D";


interface SceneObjectLoaderProps {
    obj: SceneObject;
    manager: LoadingManager;
}

const SceneObjectLoader: React.FC<SceneObjectLoaderProps> = ({
    obj,
    manager
}) => {
    const { setError, setObject, obj3d } = useObjectLoader<Object3D>();

    let comp;
    switch (obj.type) {
        case SceneObjectType.model:
            comp = <SceneModelLoader
                obj={obj}
                obj3d={obj3d}
                manager={manager}
                setError={setError}
                setObject={setObject}
            />;
            break;
        case SceneObjectType.frame:
            comp = <SceneFrameLoader
                obj={obj}
                obj3d={obj3d}
                manager={manager}
                setError={setError}
                setObject={setObject}
            />;
            break;
        case SceneObjectType.annotation:
            comp = <SceneAnnotationLoader
                obj={obj}
                obj3d={obj3d as Annotation<any, any> | null}
                manager={manager}
                setError={setError}
                setObject={setObject}
            />
            break;
    }

    return (
        <React.Fragment>
            {comp}
            {(obj.label && obj3d) && <Label2D
                parent={obj3d}
                x={obj.label.x}
                y={obj.label.y}
                z={obj.label.z}
                label={obj.label.text}
            />}
        </React.Fragment>
    )
}

function buildSceneGraph(viewer: Viewer, scene: Scene): boolean {
    let fullyLoaded = true;
    for (const obj of scene) {
        const obj3d = viewer.objects[obj.id];
        if (obj3d) {
            const parent = obj.parent ? viewer.objects[obj.parent] ?? viewer.world : viewer.world;
            parent.add(obj3d);
            obj3d.updateMatrixWorld();
        } else {
            fullyLoaded = false;
        }
    }

    viewer.dirty = true;
    return fullyLoaded;
}

const VIEWER_EVENTS = ['add-object', 'remove-object'];
export const SceneLoader: React.FC<{ options: HoneycombPanelOptions }> = ({
    options
}) => {
    const { manager, viewer } = useHoneycomb();
    const [sceneLoaded, setSceneLoaded] = useState(false);

    const refreshSceneGraph = useCallback(() => {
        setSceneLoaded(buildSceneGraph(viewer, options.scene))
    }, [options.scene, viewer]);

    useEffect(() => {
        refreshSceneGraph();
    }, [options.scene, refreshSceneGraph, viewer]);

    useEffect(() => {
        if (sceneLoaded) {
            manager.itemEnd("load-scene");

            // Point the camera on the first robot on initial load
            viewer.focusTarget = viewer.getRobots()[0];
            viewer.fixedCamera = viewer.focusTarget !== undefined;
            viewer.dirty = true;
        } else {
            manager.itemStart("load-scene");
        }
    }, [manager, sceneLoaded, viewer]);

    return (
        <React.Fragment>
            <EventWatcher
                target={viewer}
                onEventFired={refreshSceneGraph}
                events={VIEWER_EVENTS}
            />
            {options.scene.map((obj) => (
                <ObjectLoader
                    key={obj.id}
                    id={obj.id}
                    name={obj.name}
                >
                    <SceneObjectLoader
                        obj={obj}
                        manager={manager}
                    />
                </ObjectLoader>
            ))}
        </React.Fragment>
    );
}
