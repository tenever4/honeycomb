import { usePanelContext } from "@grafana/ui";
import React, { useCallback, useEffect } from "react";

import { RsvpViewer } from "../../../../pkg/ui/src/viewer";
import { LightingEditEvent } from "../editors/WorldOptions";
import { WorldOptions } from "../types";

interface LightDirectionProps {
    viewer: RsvpViewer;
    onWorldOptionsChange: (diff: Partial<WorldOptions>) => void;
}

export const LightDirection: React.FC<LightDirectionProps> = ({
    viewer,
    onWorldOptionsChange
}) => {
    const panelContext = usePanelContext();

    const render = useCallback(() => {
        // Trigger re-render when we move an object in the viewer
        viewer.dirty = true;
    }, [viewer]);

    const update = useCallback(() => {
        viewer.dirty = true;

        const sunDirection = viewer.getSunDirection();
        onWorldOptionsChange({
            sunDirection: [
                sunDirection.x,
                sunDirection.y,
                sunDirection.z,
            ]
        });
    }, [onWorldOptionsChange, viewer]);

    const draggingChanged = useCallback((event: any) => {
        if (!event.value) {
            update();
        }
    }, [update]);

    useEffect(() => {
        const subscription = panelContext.eventBus?.subscribe(LightingEditEvent, (eventBus) => {
            if (eventBus.payload) {
                viewer.transformControls.attach(viewer.directionalLightParent);
                viewer.transformControls.setMode('rotate');
                viewer.transformControls.enabled = true;
                viewer.directionalLightHelper.visible = true;
            } else {
                viewer.transformControls.detach();
                viewer.transformControls.enabled = false;
                viewer.directionalLightHelper.visible = false;
            }
        });

        viewer.transformControls.addEventListener('change', render);
        viewer.transformControls.addEventListener('dragging-changed', draggingChanged);

        return () => {
            subscription.unsubscribe();
            viewer.transformControls.removeEventListener('change', render);
            viewer.transformControls.removeEventListener('dragging-changed', draggingChanged);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}
