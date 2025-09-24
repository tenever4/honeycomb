import React from "react";
import { ADDITIONAL_PROPERTY_FLAG, type FieldTemplateProps } from '@rjsf/utils';
import { Field } from "@grafana/ui";
import WrapAdditionalTemplate from "./WrapAdditionalTemplate";
import { FormLabel } from "../common/utils";

const FieldTemplate: React.FC<FieldTemplateProps> = (props: FieldTemplateProps) => {
    const {
        id,
        label,
        children,
        rawErrors,
        schema,
        formContext,
        uiSchema,
        registry
    } = props;

    const additional = ADDITIONAL_PROPERTY_FLAG in schema;

    if (additional) {
        return (
            <WrapAdditionalTemplate {...props}>
                {children}
            </WrapAdditionalTemplate>
        )
    }

    if (schema.type === "object") {
        // Objects have their own title
        return (
            <React.Fragment>
                {children}
            </React.Fragment>
        );
    }

    return (
        <Field
            label={<FormLabel
                schema={schema}
                uiSchema={uiSchema}
                registry={registry}
                title={label}
                formContext={formContext}
            />}
            id={id}
            invalid={rawErrors !== undefined && rawErrors.length > 0}
            error={rawErrors?.join(', ')}
        >
            <>
                {children}
            </>
        </Field>
    );
}

export default FieldTemplate;

