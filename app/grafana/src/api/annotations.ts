import { type AnnotationEvent } from "@grafana/data";
import { getBackendSrv } from "@grafana/runtime";

export interface AnnotationTag {
    /**
     * The tag name
     */
    tag: string;
    /**
     * The number of occurrences of that tag
     */
    count: number;
}

export interface AnnotationTagsResponse {
    result: {
        tags: AnnotationTag[];
    };
}

export function saveAnnotation(annotation: AnnotationEvent) {
    return getBackendSrv().post('/api/annotations', annotation);
}

export function updateAnnotation(annotation: AnnotationEvent) {
    return getBackendSrv().put(`/api/annotations/${annotation.id}`, annotation);
}

export function deleteAnnotation(annotation: AnnotationEvent) {
    return getBackendSrv().delete(`/api/annotations/${annotation.id}`);
}

export async function getAnnotationTags() {
    const response: AnnotationTagsResponse = await getBackendSrv().get('/api/annotations/tags');
    return response.result.tags.map(({ tag, count }) => ({
        term: tag,
        count,
    }));
}
