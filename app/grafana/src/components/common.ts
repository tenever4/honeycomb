import { Object3D } from "three";
import { LoadingManager } from "@gov.nasa.jpl.honeycomb/core";

export interface SceneLoaderProps<T, O extends Object3D = Object3D> {
    obj: T;
    obj3d: O | null,
    setObject: (obj3d: O | null) => void;
    setError: (err: string | null) => void;

    manager: LoadingManager;
}
