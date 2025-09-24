import React, { useCallback, useState } from "react";

import {
    Collapse,
    Field,
    Input,
    Stack,
    Label,
    Switch,
    InlineLabel,
    TagsInput
} from "@grafana/ui";

import {
    Orientation,
    Position,
    SceneObject,
    SceneObjectType
} from "@gov.nasa.jpl.honeycomb/core";

import { OrientationFieldEditor, PositionFieldEditor } from "./TransformEditor";
import { type EditorProps } from "../common";
import { ModelEditor } from "./ModelObjectEditor";
import { OptionsBuilderEditor } from "../../editors/OptionsBuilderEditor";
import { annotationEditor } from "./AnnotationObjectEditor";

export const ObjectEditor: React.FC<EditorProps<SceneObject>> = ({
    value, onChange
}) => {
    const [transformIsOpen, setTransformIsOpen] = useState(false);

    const onTransformCollapseToggle = useCallback(() => {
        setTransformIsOpen(!transformIsOpen);
    }, [transformIsOpen]);

    const updatePosition = useCallback((diff: Partial<Position>) => {
        onChange({
            position: {
                ...value?.position,
                ...diff
            }
        });
    }, [value.position, onChange]);

    const updateOrientation = useCallback((diff: Partial<Orientation>) => {
        onChange({
            orientation: {
                ...value.orientation,
                ...diff
            } as Orientation
        });
    }, [value.orientation, onChange]);

    const onTagsChange = useCallback((tags: string[]) => {
        onChange({
            tags
        });
    }, [onChange]);

    return (
        <React.Fragment>
            <Field label="Name">
                <Input
                    value={value.name}
                    placeholder="Object name"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ name: e.target.value })}
                />
            </Field>
            <Field label="Description">
                <Input
                    value={value.description ?? ''}
                    placeholder="Object Description"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ description: e.target.value })}
                />
            </Field>
            <Field label="Tags" description="Mark this option with tags to be able to show/hide groups of objects">
                <TagsInput tags={value.tags} onChange={onTagsChange} />
            </Field>
            <Field
                description="Optional label in 3D scene offset from the coordinate frame"
                label="Label">
                <Switch
                    value={value.label !== undefined}
                    onChange={event => onChange({
                        label: event.currentTarget.checked ? {
                            text: '',
                            x: 0,
                            y: 0,
                            z: 0
                        } : undefined
                    })}
                />
            </Field>
            {value.label && <React.Fragment>
                <Field
                    label={<Label category={["Label"]}>Text</Label>}>
                    <Input
                        value={value.label.text}
                        onChange={event => onChange({
                            label: {
                                ...value.label,
                                text: event.currentTarget.value
                            } as SceneObject['label']
                        })}
                    />
                </Field>
                <Field label={<Label category={["Label"]}>Offset</Label>}>
                    <Stack direction="row" gap={1}>
                        <Input
                            type="number"
                            value={value.label.x}
                            placeholder="X"
                            addonBefore={<InlineLabel>X</InlineLabel>}
                            onChange={event => onChange({
                                label: {
                                    ...value.label,
                                    x: event.currentTarget.valueAsNumber
                                } as SceneObject['label']
                            })}
                        />
                        <Input
                            type="number"
                            value={value.label.y}
                            placeholder="Y"
                            addonBefore={<InlineLabel>Y</InlineLabel>}
                            onChange={event => onChange({
                                label: {
                                    ...value.label,
                                    y: event.currentTarget.valueAsNumber
                                } as SceneObject['label']
                            })}
                        />
                        <Input
                            type="number"
                            value={value.label.z}
                            placeholder="Z"
                            addonBefore={<InlineLabel>Z</InlineLabel>}
                            onChange={event => onChange({
                                label: {
                                    ...value.label,
                                    z: event.currentTarget.valueAsNumber
                                } as SceneObject['label']
                            })}
                        />
                    </Stack>

                </Field>
            </React.Fragment>}
            {value.type === SceneObjectType.model &&
                <ModelEditor value={value} onChange={onChange} />}
            {value.type === SceneObjectType.annotation &&
                <OptionsBuilderEditor
                    builder={annotationEditor}
                    value={value.annotation}
                    onChange={(diff) => onChange({
                        ...value,
                        annotation: {
                            ...value.annotation,
                            ...diff
                        }
                    })}
                    parentOptions={value}
                />}
            <Collapse label="Transform" collapsible isOpen={transformIsOpen} onToggle={onTransformCollapseToggle}>
                <PositionFieldEditor
                    value={value.position}
                    onChange={updatePosition}
                />
                <OrientationFieldEditor
                    value={value.orientation}
                    onChange={updateOrientation}
                />
            </Collapse>
        </React.Fragment>
    );
};
