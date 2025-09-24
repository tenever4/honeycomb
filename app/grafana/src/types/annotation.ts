import { Annotation, Viewer } from "@gov.nasa.jpl.honeycomb/core";
import { PanelOptionsEditorBuilder, Registry, RegistryItem } from "@grafana/data";

export enum AnnotationSchemaDataModel {
    /**
     * Feed channels one-by-one into single JS record
     */
    channelized = 'channelized',

    /**
     * Extract the entire row as a nested object
     */
    structured = 'structured'
}

interface AnnotationSchemaBase {
    dataModel: AnnotationSchemaDataModel;
}

export enum ChannelSchemaType {
    number = 'number',
    boolean = 'boolean',
    string = 'string'
}

export interface ChannelSchema {
    name: string;
    description?: string;
    type: ChannelSchemaType;
}

export interface ChannelizedAnnotationSchema extends AnnotationSchemaBase {
    dataModel: AnnotationSchemaDataModel.channelized;
    fields: ChannelSchema[];
}

export interface TableSchema {
    name: string;
    description?: string;
}

export interface StructuredAnnotationSchema extends AnnotationSchemaBase {
    dataModel: AnnotationSchemaDataModel.structured;
    fields: TableSchema[];
}

export type AnnotationSchema = (
    ChannelizedAnnotationSchema
    | StructuredAnnotationSchema
);

export type AnnotationConstructor<
    TAnnotation extends Annotation<any, any>
> = new (viewer: Viewer, id: string) => TAnnotation;

export type AnnotationDataType<T> = T extends Annotation<infer D, any> ? D : never;
export type AnnotationOptionsType<T> = T extends Annotation<any, infer O> ? O : never;

type AnnotationOptionsSupplier<TOptions> = (
    builder: PanelOptionsEditorBuilder<TOptions>
    // context: StandardEditorContext<TOptions>
) => void;

export interface AnnotationComponentProps<TAnnotation extends Annotation<any, any>> {
    annotation: TAnnotation;
    options: AnnotationOptionsType<TAnnotation>;
    setOptions: (options: AnnotationOptionsType<TAnnotation>) => void;
}

interface AnnotationRegistryItemConfig<
    TAnnotation extends Annotation<any, any>
> {
    type: string;
    name: string;
    description?: string;
    schema: AnnotationSchema;

    /**
     * React component that displays over the scene viewer.
     * This will be contained in an absolute positioned component
     * and needs to be enabled by the user.
     * 
     * TODO(tumbar) Implement handler for this
     */
    // overlay?: React.FC<AnnotationComponentProps<Options>>;

    /**
     * Widget contained in a popup menu tab.
     * Every annotation will get their own tab if this definition exists
     */
    widget?: React.FC<AnnotationComponentProps<TAnnotation>>;

    classType: AnnotationConstructor<TAnnotation>;
}

export class AnnotationRegistryItem<
    TAnnotation extends Annotation<any, any>
> implements RegistryItem {
    id: string;
    name: string;
    description?: string | undefined;

    builder: PanelOptionsEditorBuilder<AnnotationOptionsType<TAnnotation>>;

    schema: AnnotationSchema;
    classType: AnnotationConstructor<TAnnotation>;
    // overlay?: React.FC<AnnotationComponentProps<Options>>;
    widget?: React.FC<AnnotationComponentProps<TAnnotation>>;

    constructor(config: AnnotationRegistryItemConfig<TAnnotation>) {
        this.id = config.type;
        this.name = config.name;
        this.description = config.description;
        this.schema = config.schema;
        this.classType = config.classType;
        this.widget = config.widget;

        this.builder = new PanelOptionsEditorBuilder();
    }

    setAnnotationOptions(builder: AnnotationOptionsSupplier<AnnotationOptionsType<TAnnotation>>): this {
        builder(this.builder);
        return this;
    }
}

export const annotationRegistry = new Registry<AnnotationRegistryItem<any>>();
