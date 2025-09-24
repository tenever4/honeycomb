import React, { FC, useCallback } from "react";
import { PanelOptionsEditorBuilder } from "@grafana/data";

import { Annotation } from "@gov.nasa.jpl.honeycomb/core";

import { OptionsBuilderEditor } from "../../editors/OptionsBuilderEditor";
import { AnnotationComponentProps } from "../../types";

export function widgetFromBuilder<T extends Record<string, any>>(builder: PanelOptionsEditorBuilder<T>): FC<AnnotationComponentProps<
    Annotation<any, T>
>> {
    return function BuilderWidget({ options, setOptions }) {
        const onChange = useCallback((diff: Partial<T>) => {
            setOptions({
                ...options,
                ...diff
            });
        }, [setOptions, options]);

        return (
            <OptionsBuilderEditor
                builder={builder}
                value={options}
                onChange={onChange}
                parentOptions={null}
            />
        )
    };
}
