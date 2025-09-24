import { Material } from 'three';
import { MeshAnnotation, InstancedMeshAnnotation } from '../base/Annotation';

export class ShapeAnnotation extends MeshAnnotation {
    constructor(material?: Material) {
        super(undefined, material);
        this.name = 'ShapeAnnotation';
    }

    copy(source: this, recursive?: boolean) {
        const geometry = this.geometry;
        super.copy(source, recursive);
        this.geometry = geometry;
        return this;
    }
}

export class InstancedShapeAnnotation extends InstancedMeshAnnotation {
    constructor(material?: Material, count: number = 0) {
        super(undefined, material, count);
        this.name = 'InstancedShapeAnnotation';
    }

    copy(source: this, recursive?: boolean) {
        const geometry = this.geometry;
        super.copy(source, recursive);
        this.geometry = geometry;
        return this;
    }
}
