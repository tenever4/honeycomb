import { useEffect, useMemo } from "react";

import { Annotation, AnnotationSceneObject } from "@gov.nasa.jpl.honeycomb/core";

import { SceneLoaderProps } from "../common";
import { annotationRegistry } from "../../types";
import { useHoneycomb } from "../../components/Honeycomb/HoneycombContext";

export const SceneAnnotationLoader: React.FC<SceneLoaderProps<AnnotationSceneObject, Annotation<any, any>>> = ({
    obj,
    obj3d,
    setObject,
    setError
}) => {
    const { viewer } = useHoneycomb();

    // Look up the annotation registration
    const item = useMemo(() => annotationRegistry.getIfExists(
        obj.annotation.type
    ), [obj.annotation.type]);

    // Load actual object
    useEffect(() => {
        if (item) {
            setObject(new item.classType(viewer, obj.id));
            setError(null);
        } else {
            setObject(null);
            setError(`Annotation with type ${obj.annotation.type} is not registered`);
        }
    }, [item, setObject, setError, viewer, obj.id, obj.annotation.type]);

    useEffect(() => {
        if (obj3d) {
            obj3d.options(obj.annotation?.options);
        }
    }, [obj3d, obj.annotation?.options]);

    // Should we listen for annotation registrations?
    return null;
}
