import { withTheme, type ThemeProps } from '@rjsf/core';

import { CheckboxWidget } from './widgets/CheckboxWidget';
import { SelectWidget } from './widgets/SelectWidget';
import { TextareaWidget } from './widgets/TextareaWidget';

// import ArrayField from './fields/ArrayField';
// import ArraySchemaField from './fields/ArraySchemaField';
// import DescriptionField from './templates/DescriptionField';
// import GridField from './fields/GridField';
// import ObjectField from './fields/ObjectField';

import ArrayFieldItemTemplate from './templates/ArrayFieldItemTemplate';
import ArrayFieldTemplate from './templates/ArrayFieldTemplate';
import BaseInputTemplate from './templates/BaseInputTemplate';
import ObjectFieldTemplate from './templates/ObjectFieldTemplate';
import FieldTemplate from './templates/FieldTemplate';
import EmptyComponent from './EmptyComponent'

import { AddButton, MoveDownButton, MoveUpButton, RemoveButton } from './templates/ButtonTemplates';

// import "./index.scss";

export const VSCodeTheme: ThemeProps = {
    widgets: {
        CheckboxWidget,
        SelectWidget,
        TextareaWidget,
        // TextWidget,
    },
    templates: {
        FieldTemplate,
        ArrayFieldItemTemplate,
        ArrayFieldTemplate,
        ObjectFieldTemplate,
        BaseInputTemplate,
        ErrorListTemplate: EmptyComponent,

        ButtonTemplates: {
            AddButton,
            MoveDownButton,
            MoveUpButton,
            RemoveButton,
            SubmitButton: EmptyComponent
        }
    }
};

const GrafanaForm = withTheme(VSCodeTheme);
export default GrafanaForm;
