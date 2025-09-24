import { NodeModel } from "@minoru/react-dnd-treeview";
import { SceneObject } from "@gov.nasa.jpl.honeycomb/core";

export interface SceneObjectNodeData {
    id: string;
    type: SceneObject['type'];
    hasChildren: boolean;
    tags?: string[];
    helpText: string;
}

export type SceneObjectNode = NodeModel<SceneObjectNodeData>;
