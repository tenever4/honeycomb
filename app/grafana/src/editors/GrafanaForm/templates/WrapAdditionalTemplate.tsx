import React, { useEffect, useState } from 'react';

import {
    type FieldTemplateProps,
    getUiOptions,
} from '@rjsf/utils';
import { Box, Field, Input, Stack } from '@grafana/ui';
import { FormLabel } from '../common/utils';

/** The `WrapIfAdditional` component is used by the `FieldTemplate` to rename, or remove properties that are
 * part of an `additionalProperties` part of a schema.
 *
 * @param props - The `WrapIfAdditionalProps` for this component
 */
export default function WrapAdditionalTemplate(
    props: FieldTemplateProps
) {
    const {
        id,
        disabled,
        label,
        onKeyChange,
        onDropPropertyClick,
        readonly,
        children,
        uiSchema,
        registry,
        rawErrors,
        schema,
        formContext
    } = props;

    const { templates } = registry;

    // Button templates are not overridden in the uiSchema
    const { RemoveButton } = templates.ButtonTemplates;

    const [keyCache, setKeyCache] = useState(label);

    const uiOptions = getUiOptions(uiSchema);

    useEffect(() => {
        setKeyCache(label);
    }, [label]);

    if (uiOptions.arrayItem) {
        return children;
    }

    return (
        <Field
            invalid={rawErrors !== undefined && rawErrors.length > 0}
            error={rawErrors?.join(', ')}
            label={<Stack direction="row" gap={1} justifyContent="space-between">
                <FormLabel
                    schema={schema}
                    uiSchema={uiSchema}
                    registry={registry}
                    title={label}
                    formContext={formContext}
                />
                <RemoveButton
                    key={0}
                    disabled={disabled || readonly}
                    onClick={onDropPropertyClick(label)}
                    uiSchema={uiSchema}
                    registry={registry}
                />
            </Stack>}>
            <Box paddingTop={1}>
                <Stack direction="row" gap={1}>
                    <Input
                        id={`${id}-key`}
                        value={keyCache}
                        disabled={props.disabled}
                        onChange={(event) => setKeyCache(event.currentTarget.value)}
                        onBlur={(event) => onKeyChange(event.currentTarget.value)}
                        required={props.required}
                    />
                    <React.Fragment>
                        {children}
                    </React.Fragment>
                </Stack>
            </Box>
        </Field>
    );
}
