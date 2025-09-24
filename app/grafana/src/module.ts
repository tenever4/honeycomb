import { PanelPlugin } from '@grafana/data';
import { annotationRegistry, type HoneycombPanelOptions } from './types';

import { HoneycombPanel } from './components/HoneycombPanel';

import { addWorldOptions } from './editors/WorldOptions';
import { addSceneEditor } from './editors/SceneEditor';
import { addDataVolumeOptions } from './editors/DataVolumeOptions';
import { addFrameTrajectoriesOptions } from './editors/FrameTrajectoriesOptions';
import { addTagGroupsOptions } from './editors/TagGroupsEditor';
import { addWidgetGroupsOptions } from './editors/WidgetGroupsEditor';

import { markerRegistration } from './honeycomb/annotations/Marker';
import { costMapRegistration } from './honeycomb/annotations/CostMap';
import { debugRegistration } from './honeycomb/annotations/Debug';
import { heightMapRegistration } from './honeycomb/annotations/HeightMap';
import { enavRegistration } from './honeycomb/annotations/Enav';
import { coordinateFrameRegistration } from './honeycomb/annotations/CoordinateFrame';

annotationRegistry.register(markerRegistration);
annotationRegistry.register(costMapRegistration);
annotationRegistry.register(heightMapRegistration);
annotationRegistry.register(debugRegistration);
annotationRegistry.register(enavRegistration);
annotationRegistry.register(coordinateFrameRegistration);

export const plugin = new PanelPlugin<HoneycombPanelOptions>(HoneycombPanel).setPanelOptions((builder) => {
    addWorldOptions(builder);
    addSceneEditor(builder);
    addDataVolumeOptions(builder);
    addFrameTrajectoriesOptions(builder);
    addTagGroupsOptions(builder);
    addWidgetGroupsOptions(builder);
}).setDataSupport({
    annotations: true
});
