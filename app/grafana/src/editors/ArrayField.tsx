import React, { useCallback, useMemo, useState } from "react";

import {
    Box,
    Button,
    Collapse,
    Field,
    IconButton,
    Stack
} from "@grafana/ui";
import { uid } from "uid";

export function useUpdateArrayElement<T>(
    onChange: (value: T[]) => void,
    array: T[]
) {
    return useCallback((index: number, updateElement: Partial<T>) => {
        const currentElement = array[index];
        onChange([
            ...array.slice(0, index),
            {
                ...currentElement,
                ...updateElement
            } as T,
            ...array.slice(index + 1),
        ]);
    }, [array, onChange]);
}

export function useMoveArrayElement<T>(
    onChange: (value: T[]) => void,
    array: T[]
) {
    return {
        up: useCallback((index: number) => {
            const currentElement = array[index];
            if (index > 0) {
                onChange([
                    ...array.slice(0, index - 1),
                    currentElement,
                    array[index - 1],
                    ...array.slice(index + 1),
                ]);
            }
        }, [array, onChange]),
        down: useCallback((index: number) => {
            const currentElement = array[index];
            if (index < array.length - 1) {
                onChange([
                    ...array.slice(0, index),
                    array[index + 1],
                    currentElement,
                    ...array.slice(index + 2),
                ]);
            }
        }, [array, onChange])
    }
}

interface ArrayFieldBase {
    name?: string;
    id?: string;
}

export interface ArrayItemProps<T> {
    value: T;
    getName?: (v: T) => string;
    onDelete: () => void;
    onDuplicate?: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
}

export function ArrayItem<T extends ArrayFieldBase>({
    children,
    value,
    getName,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown
}: ArrayItemProps<T> & React.PropsWithChildren) {
    const [isOpen, setIsOpen] = useState(true);
    const name = useMemo(() => getName ? getName(value) : (value as any).name, [getName, value]);

    const onCollapseToggle = useCallback(() => {
        setIsOpen(!isOpen);
    }, [isOpen]);

    return (
        <Collapse
            label={
                <Box flex="1" paddingRight={1}>
                    <Stack flex="1">
                        {name ?? '(unnamed)'}
                        <div style={{ flex: 1 }} />
                        {onMoveUp && <IconButton
                            name="arrow-up"
                            variant="secondary"
                            size="sm"
                            aria-label="Move Up"
                            onClick={onMoveUp}
                        />}
                        {onMoveDown && <IconButton
                            name="arrow-down"
                            variant="secondary"
                            size="sm"
                            aria-label="Move Down"
                            onClick={onMoveDown}
                        />}
                        {onDuplicate && <Button
                            icon="copy"
                            variant="secondary"
                            size="sm"
                            onClick={onDuplicate}
                        >
                            Duplicate
                        </Button>}
                        <Button
                            icon="trash-alt"
                            variant="destructive"
                            size="sm"
                            onClick={onDelete}
                        >
                            Delete
                        </Button>
                    </Stack>
                </Box>
            }
            isOpen={true}
            onToggle={onCollapseToggle}
        >
            {children}
        </Collapse>
    );
}

export interface ArrayFieldWrapperProps<T extends Partial<ArrayFieldBase> | any> {
    createNew: () => T;
    getName?: (v: T) => string,
    value: T[];
    onChange: (value: T[]) => void;
    children: React.ReactNode[];
    move?: boolean;
    addName?: string;
}

export function ArrayFieldWrapper<T extends ArrayFieldBase>({
    children,
    value,
    getName,
    onChange,
    createNew,
    move,
    addName = 'Add'
}: ArrayFieldWrapperProps<T>) {
    const {
        up: onMoveUp,
        down: onMoveDown
    } = useMoveArrayElement(onChange, value);

    return (
        <React.Fragment>
            {children.map((childNode, i) => (
                <ArrayItem
                    key={value[i].id ?? i}
                    value={value[i]}
                    getName={getName}
                    onDelete={() => onChange([...value.slice(0, i), ...value.slice(i + 1)])}
                    onDuplicate={() => onChange([
                        ...value,
                        {
                            ...value[i],
                            name: value[i].name ? value[i].name + ' (Duplicate)' : undefined,
                            id: value[i].id ? uid() : undefined
                        }
                    ])}
                    onMoveUp={(move && i > 0) ? () => onMoveUp(i) : undefined}
                    onMoveDown={(move && i < value.length - 1) ? () => onMoveDown(i) : undefined}
                >
                    {childNode}
                </ArrayItem>
            ))}
            <Field>
                <Stack direction="row" gap={1}>
                    <Button
                        variant="secondary"
                        icon="plus"
                        size="sm"
                        onClick={() => onChange([...value, createNew()])}
                    >
                        {addName}
                    </Button>
                </Stack>
            </Field>
        </React.Fragment>
    )
}
