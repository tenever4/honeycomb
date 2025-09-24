import React, { useContext } from "react";
import type { AnnotationDriver, KinematicsDriver } from "@gov.nasa.jpl.honeycomb/extensions";
import type { LoadingManager } from "@gov.nasa.jpl.honeycomb/core";

import type { RsvpViewer } from "../../../../../pkg/ui/src/viewer";
import type { FrameTrajectoriesDriver } from "../../honeycomb/FrameTrajectoriesDriver";
import { GrafanaKinematicsAnimator } from "../../honeycomb/KinematicsAnimator";
import { GrafanaAnnotationsAnimator } from "../../honeycomb/AnnotationsAnimator";

export interface HoneycombContextState {
    viewer: RsvpViewer;
    manager: LoadingManager;

    drivers: {
        kinematics: KinematicsDriver;
        annotations: AnnotationDriver;
        frameTrajectories: FrameTrajectoriesDriver;
    };

    animators: {
        kinematics: GrafanaKinematicsAnimator;
        annotations: GrafanaAnnotationsAnimator;
    }
}

export const HoneycombContext = React.createContext<HoneycombContextState>(null!);

export function useHoneycomb() {
    return useContext(HoneycombContext);
}
