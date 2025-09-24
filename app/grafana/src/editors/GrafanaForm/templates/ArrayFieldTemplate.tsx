import React from 'react';
import * as rjsf from "@rjsf/utils";

import { Field, Stack } from '@grafana/ui';
import { FormLabel } from '../common/utils';

export default function c({
    canAdd,
    disabled,
    uiSchema,
    items,
    onAddClick,
    readonly,
    registry,
    schema,
    title,
    idSchema,
    formContext
}: rjsf.ArrayFieldTemplateProps) {
    const uiOptions = rjsf.getUiOptions(uiSchema, registry.globalUiOptions);
    const ArrayFieldItemTemplate = rjsf.getTemplate<'ArrayFieldItemTemplate'>(
        'ArrayFieldItemTemplate',
        registry,
        uiOptions
    );


    // Button templates are not overridden in the uiSchema
    const {
        ButtonTemplates: { AddButton },
    } = registry.templates;

    return (
        <>
            <Field id={idSchema.$id} label={<FormLabel
                schema={schema}
                uiSchema={uiSchema}
                registry={registry}
                title={title}
                formContext={formContext}
            />}>
                <React.Fragment>
                    {items.map(({ key, ...itemProps }: rjsf.ArrayFieldTemplateItemType) => (
                        <ArrayFieldItemTemplate key={key} {...itemProps} />
                    ))}
                </React.Fragment>
            </Field>
            <Field>
                <Stack direction="row" gap={1}>
                    {canAdd && <AddButton
                        key={0}
                        onClick={onAddClick}
                        disabled={disabled || readonly}
                        uiSchema={uiSchema}
                        registry={registry}
                    />}
                </Stack>
            </Field>
        </>
    );
}
