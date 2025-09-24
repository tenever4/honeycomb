import { Annotation, Viewer } from "@gov.nasa.jpl.honeycomb/core";
import { Group } from "three";

import {
    AnnotationRegistryItem,
    AnnotationSchemaDataModel
} from "../../types";

import { AxesHelper } from "./geometry/AxesHelper";

interface CoordinateFrameOptions {
    scale: number;
    opacity: number;
}

class CoordinateFrame extends Group implements Annotation<{}, CoordinateFrameOptions> {
    helper: AxesHelper;

    constructor(
        readonly viewer: Viewer,
        id: string
    ) {
        super();
        this.name = id;
        this.helper = new AxesHelper();
        this.renderOrder = Infinity;

        this.add(this.helper);
    }

    options(_options: Partial<CoordinateFrameOptions>): void {
        const options = {
            scale: 1,
            opacity: 1,
            ..._options
        } satisfies CoordinateFrameOptions;

        this.helper.size = typeof options.scale === "number" ? options.scale : 1;
        this.helper.opacity = typeof options.opacity === "number" ? options.opacity : 1;;

        this.viewer.dirty = true;
    }

    update(): void { }
}

export const coordinateFrameRegistration = new AnnotationRegistryItem({
    classType: CoordinateFrame,
    type: "coordinateFrame",
    name: "Coordinate Frame",
    description: "Shows to XYZ axes of a coordinate frame",

    schema: {
        dataModel: AnnotationSchemaDataModel.channelized,
        fields: []
    }
}).setAnnotationOptions((builder) => {
    builder.addSliderInput({
        path: "opacity",
        name: "Opacity",
        settings: {
            min: 0,
            max: 1,
            step: 0.01
        },
        defaultValue: 1
    }).addNumberInput({
        path: 'scale',
        name: 'Scale',
        description: 'Arrow scaling factor',
        defaultValue: 1,
        settings: {
            min: 0
        }
    });
});
