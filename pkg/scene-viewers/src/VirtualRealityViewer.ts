// import { Viewer } from './Viewer';
// import {
//     Vector3,
//     Group,
//     BufferGeometry,
//     Float32BufferAttribute,
//     LineBasicMaterial,
//     Line,
//     AdditiveBlending,
//     Raycaster,
// } from 'three';

// type Constructor = new (...args: any) => Viewer;
// export function VirtualRealityViewerMixin<TBase extends Constructor>(base: TBase) {
//     return class extends base {
//         isCapableVR: boolean;

//         private foveationLevelVR?: number;
//         private cameraRigVR?: Group;
//         private orbitCameraSavedPositionVR?: Vector3;
//         private cameraRigSavedPositionVR?: Vector3;

//         constructor(...args: any) {
//             super(...args);

//             this.isCapableVR = false;
//             this.savedPostProcessingIndexesVR = [];

//             if (navigator.xr) {
//                 this.isDisplayConnectedXR(true);
//                 this.foveationLevelVR = 3;
//                 this.cameraRigVR = this.createCameraRigVR();
//                 this.orbitCameraSavedPositionVR = new Vector3();
//             }
//         }

//         render() {
//             if (!this.renderer.xr.enabled) {
//                 super.render();
//             }
//         }

//         renderVR() {
//             Viewer.prototype.render.call(this);
//         }

//         toggleVR() {
//             (navigator as NavigatorVr).getVRDisplays?.().then(displays => {
//                 const device = displays[0];
//                 if (device.isPresenting) {
//                     device.exitPresent();
//                 } else {
//                     if (this.renderer.xr.getDevice() == null) {
//                         this.renderer.xr.setDevice(device);
//                     }

//                     this.updateAspectRatioForDeviceVR(device);
//                     device.requestPresent([
//                         {
//                             source: this.renderer.domElement,
//                             attributes: { foveationLevel: this.foveationLevelVR },
//                         },
//                     ]);
//                 }
//             });
//         }

//         isDisplayConnectedXR(isConnected: boolean) {
//             this.isCapableVR = isConnected;

//             // TODO these events should be added or removed when the element is added or removed from the page
//             if (isConnected) {
//                 window.addEventListener('xr')
//                 window.addEventListener('vrdisplayactivate', e => this.activateVR(e));
//                 window.addEventListener('vrdisplaypresentchange', e => this.presentChangeVR(e));
//                 window.removeEventListener('vrdisplayconnect', () => this.isDisplayConnectedVR(true));
//                 window.addEventListener('vrdisplaydisconnect', () => this.isDisplayConnectedVR(false));
//             } else {
//                 window.removeEventListener('vrdisplayactivate', e => this.activateVR(e));
//                 window.removeEventListener('vrdisplaypresentchange', e => this.presentChangeVR(e));
//                 window.addEventListener('vrdisplayconnect', () => this.isDisplayConnectedVR(true));
//                 window.removeEventListener('vrdisplaydisconnect', () => this.isDisplayConnectedVR(false));
//             }

//             this.dispatchEvent({ type: 'vrdisplayconnectionchange', detail: isConnected });
//         }

//         enterVR() {
//             this.switchToCameraRigVR();

//             this.controls.enabled = false;

//             this.enablePostProcessingVR(false);

//             this.renderer.xr.enabled = true;
//             this.renderer.setAnimationLoop(() => this.renderVR());
//         }

//         exitVR() {
//             this.switchToOrbitCameraVR();

//             this.renderer.xr.enabled = false;
//             this.renderer.setAnimationLoop(() => null);

//             this.controls.enabled = true;
//             this.controls.update();

//             this.enablePostProcessingVR(true);

//             this.setSize(this.domElement.clientWidth, this.domElement.clientHeight);
//             this.dirty = true;
//             super.render();
//         }

//         activateVR(e) {
//             e.display.requestPresent([
//                 {
//                     source: this.renderer.domElement,
//                     attributes: { foveationLevel: this.foveationLevelVR },
//                 },
//             ]);
//         }

//         presentChangeVR(e) {
//             e.display.isPresenting ? this.enterVR() : this.exitVR();
//         }

//         updateAspectRatioForDeviceVR(device) {
//             const renderWidth = device.getEyeParameters('left').renderWidth;
//             const renderHeight = device.getEyeParameters('left').renderHeight;
//             this.setSize(renderWidth, renderHeight);
//         }

//         switchToCameraRigVR() {
//             if (this.cameraRigSavedPositionVR == null) {
//                 this.moveCameraRigToRobotPositionVR();
//             }
//             this.orbitCameraSavedPositionVR.copy(this.camera.position);
//             this.cameraRigVR.position.copy(this.cameraRigSavedPositionVR);
//         }

//         switchToOrbitCameraVR() {
//             this.camera.position.copy(this.orbitCameraSavedPositionVR);
//             this.cameraRigSavedPositionVR.copy(this.cameraRigVR.position);
//             this.cameraRigVR.position.set(0, 0, 0);
//         }

//         moveCameraRigToRobotPositionVR() {
//             let robot = Object.values(this.robots)[0];
//             const cameraRigSavedPositionVR = new Vector3(
//                 robot.position.x,
//                 robot.position.z + 100,
//                 robot.position.y + 5,
//             );

//             const raycaster = new Raycaster(
//                 cameraRigSavedPositionVR,
//                 new Vector3(0, -1, 0),
//                 0,
//                 200,
//             );
//             const intersectedObjects = raycaster.intersectObjects(this.scene.children, true);
//             cameraRigSavedPositionVR.y = intersectedObjects.length
//                 ? intersectedObjects[0].point.y
//                 : robot.position.z;

//             this.cameraRigSavedPositionVR = cameraRigSavedPositionVR;
//         }

//         createCameraRigVR() {
//             const cameraRigVR = new Group();
//             this.scene.add(cameraRigVR);

//             cameraRigVR.add(this.getCamera());

//             const controllers = [this.createControllerVR(0), this.createControllerVR(1)];
//             cameraRigVR.add(controllers[0]);
//             cameraRigVR.add(controllers[1]);

//             return cameraRigVR;
//         }

//         createControllerVR(id) {
//             const controller = this.renderer.xr.getController(id);
//             this.scene.add(controller);

//             this.addLineToControllerVR(controller);

//             return controller;
//         }

//         addLineToControllerVR(controller) {
//             const geometry = new BufferGeometry();
//             geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
//             geometry.setAttribute('color', new Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));
//             const material = new LineBasicMaterial({
//                 vertexColors: true,
//                 blending: AdditiveBlending,
//             });
//             controller.add(new Line(geometry, material));
//         }

//         enablePostProcessingVR(shouldEnable) {
//             this.optimizer.enabled = shouldEnable;
//             if (shouldEnable) {
//                 this.savedPostProcessingIndexesVR.forEach(() => {
//                     this.composer.passes[this.savedPostProcessingIndexesVR.pop()].enabled = true;
//                 });
//             } else {
//                 for (let i = 1; i < this.composer.passes.length; ++i) {
//                     this.composer.passes[this.savedPostProcessingIndexesVR.push(i)].enabled = false;
//                 }
//             }
//         }
//     };
// }
