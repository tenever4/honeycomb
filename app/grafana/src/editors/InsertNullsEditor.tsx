import { StandardEditorProps, SelectableValue } from '@grafana/data';
import { RadioButtonGroup, Stack } from '@grafana/ui';

import { InputPrefix, NullsThresholdInput } from './NullsThresholdInput';
import React from 'react';

const DISCONNECT_OPTIONS: Array<SelectableValue<boolean | number>> = [
    {
        label: 'Never',
        value: false,
    },
    {
        label: 'Threshold',
        value: 3600000, // 1h
    },
];

type Props = Pick<StandardEditorProps<boolean | number>, (
    "value" |
    "onChange"
)>;

export const InsertNullsEditor = ({ value, onChange }: Props) => {
    const isThreshold = typeof value === 'number';
    DISCONNECT_OPTIONS[1].value = isThreshold ? value : 3600000; // 1h

    return (
        <Stack direction="row">
            <RadioButtonGroup
                value={value}
                options={DISCONNECT_OPTIONS}
                onChange={onChange}
            />
            {isThreshold && (
                <NullsThresholdInput
                    value={value}
                    onChange={onChange}
                    inputPrefix={InputPrefix.GreaterThan}
                    isTime={true}
                />
            )}
        </Stack>
    );
};
