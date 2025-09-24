import React from "react";

import { PanelOptionsEditorBuilder, StandardEditorContext } from "@grafana/data";
import { Field, Label } from "@grafana/ui";
import { EditorProps, useCategoryContext, useEditorContext } from "./common";

export interface OptionsBuilderEditorProps<TOptions, TParent> extends EditorProps<TOptions> {
    builder: PanelOptionsEditorBuilder<TOptions>;
    parentOptions: TParent;
}

export function OptionsBuilderEditor<TOptions extends Record<string, any>, TParent>({
    parentOptions,
    builder,
    value,
    onChange
}: OptionsBuilderEditorProps<TOptions, TParent>) {
    const editorContext = useEditorContext();

    const context: StandardEditorContext<TParent> = React.useMemo(() => ({
        ...editorContext,
        options: parentOptions,
    }), [editorContext, parentOptions]);

    const category = useCategoryContext();

    const def: Record<string, any> = {};
    let pushDefault = false;
    for (const item of builder.getItems()) {
        if (value?.[item.path] === undefined && item.defaultValue !== undefined) {
            def[item.path] = item.defaultValue;
            pushDefault = true;
        }
    }

    if (pushDefault) {
        onChange({
            ...value,
            ...def
        });
        return null;
    }

    return (
        <React.Fragment>
            {builder.getItems().map((item) => {
                if (item.showIf) {
                    if (!item.showIf(value, context.data)) {
                        return null;
                    }
                }

                const editor = <item.editor
                    key={item.path}
                    value={value[item.path] ?? item.defaultValue}
                    onChange={(subValue) => {
                        onChange({
                            ...value,
                            [item.path]: subValue
                        })
                    }}
                    context={context}
                    item={item}
                />;

                if (item.name.length === 0) {
                    // The editor will provide the <Field>
                    return editor;
                }

                return (
                    <Field
                        key={item.path}
                        label={<Label
                            category={[
                                ...category,
                                ...(item.category ?? [])
                            ]}
                            description={item.description}
                        >
                            {item.name}
                        </Label>}
                    >
                        {editor}
                    </Field>
                )
            })}
        </React.Fragment>
    );
}
