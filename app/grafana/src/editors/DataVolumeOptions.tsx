import React, { useCallback } from 'react';
import type { DataVolumeField, HoneycombPanelOptions } from '../types';

import {
    DataFrame,
    PanelOptionsEditorBuilder,
    StandardEditorProps
} from "@grafana/data";

import {
    Field,
    Stack,
    ColorPicker,
    Input
} from '@grafana/ui';

import { EditorProps, FieldSelector } from './common';
import { ArrayFieldWrapper, useUpdateArrayElement } from './ArrayField';

const DataVolumeFieldEditor: React.FC<EditorProps<DataVolumeField> & { data: DataFrame[]; }> = ({
    onChange,
    value,
    data
}) => {
    const onFieldChange = useCallback((value: string) => {
        onChange({ field: value });
    }, [onChange]);

    const onColorChange = useCallback((value: string) => {
        onChange({ color: value });
    }, [onChange]);

    return (
        <React.Fragment>
            <Field label="Label">
                <Stack direction="row" gap={1}>
                    <Input
                        value={value?.name}
                        placeholder="Label"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ name: e.target.value })}
                    />
                    <ColorPicker
                        color={value?.color ?? 'white'}
                        onChange={onColorChange}
                    />
                </Stack>
            </Field>
            <Field label="Field">
                <FieldSelector
                    onChange={onFieldChange}
                    value={value?.field}
                    data={data}
                />
            </Field>
        </React.Fragment>
    )
}

const DataVolumeOptionsEditor: React.FC<StandardEditorProps<DataVolumeField[], undefined, HoneycombPanelOptions>> = ({
    value: fields,
    onChange,
    context
}) => {
    const updateFieldObject = useUpdateArrayElement(onChange, fields);

    return (
        <ArrayFieldWrapper
            onChange={onChange}
            value={fields}
            createNew={() => ({ color: 'white', name: '' })}
        >
            {fields.map((o: DataVolumeField, i: number) => (
                <DataVolumeFieldEditor
                    key={i}
                    value={o}
                    data={context.data}
                    onChange={(delta) => updateFieldObject(i, delta)}
                />
            ))}
        </ArrayFieldWrapper>
    );
}

export function addDataVolumeOptions(builder: PanelOptionsEditorBuilder<HoneycombPanelOptions>) {
    return builder.addCustomEditor<undefined, DataVolumeField[]>({
        path: 'dataVolumes',
        id: 'dataVolumes',
        category: ['Data Volumes'],
        description: '',
        name: '',
        defaultValue: [],
        editor: DataVolumeOptionsEditor,
    });
}
