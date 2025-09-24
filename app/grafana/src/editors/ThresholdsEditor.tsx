import { css } from '@emotion/css';
import { isNumber } from 'lodash';
import * as React from 'react';

import {
    GrafanaTheme2,
    SelectableValue,
    Threshold,
    ThresholdsConfig,
    ThresholdsMode,
} from '@grafana/data';

import {
    Button,
    ColorPicker,
    colors,
    IconButton,
    Input,
    Label,
    RadioButtonGroup,
    Stack,
    Text,
    useStyles2
} from '@grafana/ui';
import { EditableLabel } from './EditableLabel';

const modes: Array<SelectableValue<ThresholdsMode>> = [
    { 
        value: ThresholdsMode.Absolute, 
        label: 'Absolute', 
        description: 'Pick thresholds based on the absolute values' 
    },
    {
        value: ThresholdsMode.Percentage,
        label: 'Percentage',
        description: 'Pick threshold based on the percent between min/max',
    },
];

interface ThresholdInputProps {
    mode: ThresholdsMode;
    index: number;

    state?: string;
    onChangeState: (state: string) => void;

    color: string;
    onChangeColor: (color: string) => void;

    value?: number;
    onChangeValue: (value: number) => void;

    onBlur: () => void;
    onRemove: () => void;
}

const ThresholdInput = React.forwardRef<HTMLInputElement, ThresholdInputProps>(({
    index,
    mode,

    onChangeColor,
    onChangeValue,
    onChangeState,

    color,
    value,
    state,

    onBlur,
    onRemove
}, ref) => {
    const isPercent = mode === ThresholdsMode.Percentage;
    const styles = useStyles2(getStyles);

    const onChangedValueInput = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const cleanValue = event.target.value.replace(/,/g, '.');
        const parsedValue = parseFloat(cleanValue);
        const value = isNaN(parsedValue) ? '' : parsedValue;

        onChangeValue(value as number);
    }, [onChangeValue]);

    const ariaLabel = `Threshold ${index + 1}`;
    if (!isFinite(value ?? -Infinity)) {
        return (
            <div className={styles.item}>
                <Input
                    ref={ref}
                    type="text"
                    value={'Base'}
                    disabled
                    aria-label={ariaLabel}
                    prefix={
                        <div className={styles.colorPicker}>
                            <ColorPicker
                                color={color}
                                onChange={onChangeColor}
                                enableNamedColors={false}
                            />
                        </div>
                    }

                    suffix={
                        <EditableLabel
                            value={state ?? `${value ?? 0}`}
                            onChange={onChangeState}
                        />
                    }
                />
            </div>
        );
    }

    return (
        <Input
            ref={ref}
            type="number"
            step="0.0001"
            onChange={onChangedValueInput}
            value={value}
            onBlur={onBlur}
            prefix={
                <div className={styles.inputPrefix}>
                    <div className={styles.colorPicker}>
                        <ColorPicker
                            color={color}
                            onChange={onChangeColor}
                            enableNamedColors={false}
                        />
                    </div>
                    {isPercent && <div className={styles.percentIcon}>%</div>}
                </div>
            }
            suffix={
                <Stack gap={1} direction="row">
                    <EditableLabel
                        value={state ?? `${value ?? 0}`}
                        onChange={onChangeState}
                    />
                    <IconButton
                        className={styles.trashIcon}
                        name="trash-alt"
                        onClick={onRemove}
                        tooltip={`Remove ${ariaLabel}`}
                    />
                </Stack>
            }
        />
    );
});

ThresholdInput.displayName = 'ThresholdInput';

function sortThresholds<T extends Threshold>(thresholds: T[]): T[] {
    return thresholds.sort((t1, t2) => (t1.value ?? 0) - (t2.value ?? 0));
}

export interface ThresholdEditorProps {
    value: ThresholdsConfig;
    absoluteOnly?: boolean;
    onChange: (thresholds: ThresholdsConfig) => void;
}

export const ThresholdsEditor: React.FC<ThresholdEditorProps> = ({
    value,
    absoluteOnly,
    onChange
}) => {
    const styles = useStyles2(getStyles);

    const latestThresholdInputRef = React.useRef<HTMLInputElement>(null);

    const isAddingThresholdRef = React.useRef(false);

    // The next update to `steps` will be synced to `value`
    const syncValue = React.useRef(false);

    // The next update to `value` will be synced to `steps`
    const syncState = React.useRef(true);

    const [steps, setSteps] = React.useState(toThresholdsWithKey(value.steps));

    const onAddThreshold = React.useCallback(() => {
        let nextValue = 0;

        if (steps.length > 1) {
            nextValue = (steps[steps.length - 1].value ?? 0) + 10;
        }

        let color = colors.filter((c) => !steps.some((t) => t.color === c))[1];
        if (!color) {
            // Default color when all colors are used
            color = '#CCCCCC';
        }

        const add = {
            value: nextValue,
            color: color,
            key: steps.length,
        };

        isAddingThresholdRef.current = true;
        syncValue.current = true;
        setSteps(sortThresholds([...steps, add]));
    }, [steps]);

    const onRemoveThreshold = React.useCallback((threshold: ThresholdWithKey) => {
        if (!steps.length) {
            return;
        }

        // Don't remove index 0
        if (threshold.key === steps[0].key) {
            return;
        }

        syncValue.current = true;
        setSteps(steps.filter((t) => t.key !== threshold.key));
    }, [steps]);

    const onChangeThresholdValue = React.useCallback((threshold: ThresholdWithKey, value: number) => {
        const newSteps = steps.map((t) => {
            if (t.key === threshold.key) {
                t = { ...t, value: value as number };
            }
            return t;
        });

        if (newSteps.length) {
            newSteps[0].value = -Infinity;
        }

        setSteps(sortThresholds(newSteps));
    }, [steps]);

    const onChangeThresholdColor = React.useCallback((threshold: ThresholdWithKey, color: string) => {
        const newThresholds = steps.map((t) => {
            if (t.key === threshold.key) {
                t = { ...t, color: color };
            }

            return t;
        });

        syncValue.current = true;
        setSteps(newThresholds);
    }, [steps]);

    const onChangeThresholdState = React.useCallback((threshold: ThresholdWithKey, state?: string) => {
        const newThresholds = steps.map((t) => {
            if (t.key === threshold.key) {
                t = { ...t, state: state };
            }

            return t;
        });

        syncValue.current = true;
        setSteps(newThresholds);
    }, [steps]);

    const onBlur = React.useCallback(() => {
        syncValue.current = true;
        setSteps(sortThresholds([...steps]));
    }, [steps]);

    const onModeChanged = React.useCallback((mode?: ThresholdsMode) => {
        onChange({
            ...value,
            mode: mode!
        });
    }, [onChange, value]);

    React.useEffect(() => {
        if (syncValue.current) {
            syncValue.current = false;
            syncState.current = false;
            onChange(thresholdsWithoutKey(value, steps));
        }
    }, [onChange, steps, value]);

    React.useEffect(() => {
        if (syncState.current) {
            syncValue.current = false;
            setSteps(toThresholdsWithKey(value.steps));
        }

        syncState.current = true;
    }, [value]);

    React.useEffect(() => {
        if (isAddingThresholdRef.current) {
            isAddingThresholdRef.current = false;
            if (latestThresholdInputRef.current) {
                latestThresholdInputRef.current.focus();
            }
        }
    }, [steps]);

    return (
        <div className={styles.wrapper}>
            <Button
                size="sm"
                icon="plus"
                onClick={onAddThreshold}
                variant="secondary"
                className={styles.addButton}
                fullWidth
            >
                Add threshold
            </Button>
            <div className={styles.thresholds}>
                {steps
                    .slice(0)
                    .reverse()
                    .map((threshold, idx) => (
                        <div key={`${threshold.key}`} className={styles.item}>
                            <ThresholdInput
                                ref={idx === 0 ? latestThresholdInputRef : null}
                                mode={value.mode}

                                value={threshold.value}
                                color={threshold.color}
                                state={threshold.state}

                                onChangeValue={(value) => onChangeThresholdValue(threshold, value)}
                                onChangeColor={(color) => onChangeThresholdColor(threshold, color)}
                                onChangeState={(state) => onChangeThresholdState(threshold, state)}

                                onBlur={onBlur}
                                onRemove={() => onRemoveThreshold(threshold)}
                                index={idx}
                            />
                        </div>
                    ))}
            </div>

            <Text variant="bodySmall" color="secondary">
                Each threshold defines the color between its own value (inclusive) and the next threshold value (exclusive) where this color will display.
                The base color value will map from zero to the first threshold.
            </Text>

            {!absoluteOnly && <div>
                <Label description="Percentage means thresholds relative to min & max">Thresholds mode</Label>
                <RadioButtonGroup options={modes} onChange={onModeChanged} value={value.mode} />
            </div>}

        </div>
    );
}

interface ThresholdWithKey extends Threshold {
    key: number;
}

let counter = 100;

function toThresholdsWithKey(steps?: Threshold[]): ThresholdWithKey[] {
    if (!steps || steps.length === 0) {
        steps = [{ value: -Infinity, color: 'green' }];
    }

    return sortThresholds([...steps])
        .filter((t, i) => isNumber(t.value) || i === 0 || t.value === undefined)
        .map((t) => ({
            color: t.color,
            value: t.value === null ? -Infinity : t.value,
            state: t.state,
            key: counter++,
        } satisfies ThresholdWithKey));
}

export function thresholdsWithoutKey(thresholds: ThresholdsConfig, steps: ThresholdWithKey[]): ThresholdsConfig {
    const mode = thresholds.mode ?? ThresholdsMode.Absolute;
    return {
        mode,
        steps: steps.map((t) => {
            const { key, ...rest } = t;
            return rest; // everything except key
        }),
    };
}

interface ThresholdStyles {
    wrapper: string;
    thresholds: string;
    item: string;
    colorPicker: string;
    addButton: string;
    percentIcon: string;
    inputPrefix: string;
    trashIcon: string;
}

const getStyles = ((theme: GrafanaTheme2): ThresholdStyles => {
    return {
        wrapper: css`
      display: flex;
      flex-direction: column;
    `,
        thresholds: css`
      display: flex;
      flex-direction: column;
      margin-bottom: ${theme.spacing(2)};
    `,
        item: css`
      margin-bottom: ${theme.spacing(1)};

      &:last-child {
        margin-bottom: 0;
      }
    `,
        colorPicker: css`
      padding: 0 ${theme.spacing(1)};
    `,
        addButton: css`
      margin-bottom: ${theme.spacing(1)};
    `,
        percentIcon: css`
      font-size: ${theme.typography.bodySmall.fontSize};
      color: ${theme.colors.text.secondary};
    `,
        inputPrefix: css`
      display: flex;
      align-items: center;
    `,
        trashIcon: css`
      color: ${theme.colors.text.secondary};
      cursor: pointer;
      margin-right: 0;

      &:hover {
        color: ${theme.colors.text};
      }
    `,
    };
});
