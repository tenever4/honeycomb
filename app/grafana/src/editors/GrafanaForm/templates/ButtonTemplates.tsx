import React from "react";
import * as rjsf from "@rjsf/utils";
import { Button } from "@grafana/ui";

export function AddButton({ icon, iconType, uiSchema, registry, ...props }: rjsf.IconButtonProps) {
    return (
        <Button
            variant="secondary"
            icon="plus"
            size="sm"
            {...props}
        >
            Add
        </Button>
    );
}

export function MoveDownButton({ icon, iconType, uiSchema, registry, ...props }: rjsf.IconButtonProps) {
    return (
        <Button
            variant="secondary"
            icon="arrow-down"
            size="sm"
            {...props}
        >
            Move Down
        </Button>
    );
}

export function MoveUpButton({ icon, iconType, uiSchema, registry, ...props }: rjsf.IconButtonProps) {
    return (
        <Button
            variant="secondary"
            icon="arrow-up"
            size="sm"
            {...props}
        >
            Move Up
        </Button>
    );
}

export function RemoveButton({ icon, iconType, uiSchema, registry, ...props }: rjsf.IconButtonProps) {
    return (
        <Button
            variant="destructive"
            icon="trash-alt"
            size="sm"
            {...props}
        >
            Delete
        </Button>
    );
}
