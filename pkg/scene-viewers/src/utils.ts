import { PlaneGeometry, OrthographicCamera, Mesh, Material, WebGLRenderer } from 'three';

const _quadMesh = new Mesh(new PlaneGeometry(1, 1));
const _quadCam = new OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1000);

function drawFullScreenQuad(renderer: WebGLRenderer, material: Material) {
    const prevAutoClear = renderer.autoClear;
    _quadMesh.material = material;

    renderer.autoClear = false;
    renderer.render(_quadMesh, _quadCam);
    renderer.autoClear = prevAutoClear;

    (_quadMesh.material as any) = null;
}

export { drawFullScreenQuad };
