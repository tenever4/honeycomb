import { Camera, Clock, Vector3, Vector4 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const changeEvent = { type: 'change' };
const startEvent = { type: 'fly-start' };
const endEvent = { type: 'fly-end' };
const tempVector = new Vector4(0, 0, 0, 0);

function Vec4To3(v4: Vector4): Vector3 {
    return new Vector3(...v4.toArray().slice(3));
}

/**
 * An extension of three.js' OrbitControls that allow for flying with the WASD keys.
 *
 * WASD are used to move the camera forward, back, left, and right. QE are used to move
 * the camera up and down. And shift can be used to fly the camera faster.
 *
 * @extends OrbitControls
 */
export class FlyOrbitControls extends OrbitControls {
    enableKeys: boolean = false;

    /**
     * Whether to enable flight controls.
     */
    enableFlight: boolean = true;

    /**
     * The base speed to fly at when shift is not held. Specified in units per second.
     */
    baseSpeed: number = 0.1;

    /**
     * The fast speed to fly at when shift is held. Specified in units per second.
     * @member {Number}
     * @default 0.1
     */
    fastSpeed: number = 0.3;

    forwardKey = 'w';
    backKey = 's';
    leftKey = 'a';
    rightKey = 'd';
    upKey = 'q';
    downKey = 'e';
    fastKey = '';

    blurCallback: () => void;
    keyDownCallback: (e: KeyboardEvent) => void;
    keyUpCallback: (e: KeyboardEvent) => void;

    /**
     * Takes the camera and renderer.domElement that would normally be passed to OrbitControls.
     */
    constructor(camera: Camera, domElement: HTMLElement) {
        super(camera, domElement);

        let fastHeld = false;
        let forwardHeld = false;
        let backHeld = false;
        let leftHeld = false;
        let rightHeld = false;
        let upHeld = false;
        let downHeld = false;

        let originalMinDistance = 0;
        let originalMaxDistance = 0;
        let rafHandle = - 1;
        const originalTarget = new Vector3();
        const clock = new Clock();

        const endFlight = () => {
            if (rafHandle !== - 1) {

                // cancel the animation playing
                cancelAnimationFrame(rafHandle);
                rafHandle = - 1;

                // store the original distances for the controls
                this.minDistance = originalMinDistance;
                this.maxDistance = originalMaxDistance;

                const targetDistance = camera.position.distanceTo(originalTarget);
                tempVector
                    .set(0, 0, - 1, 0)
                    .applyMatrix4(camera.matrixWorld);

                this.target
                    .copy(camera.position)
                    .addScaledVector(
                        new Vector3(tempVector.x, tempVector.y, tempVector.z),
                        targetDistance
                    );

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                this.dispatchEvent({ ...endEvent, target: undefined });
            }
        };

        const updateFlight = () => {
            if (!this.enabled || !this.enableFlight) {
                return;
            }

            rafHandle = requestAnimationFrame(updateFlight);

            // get the direction
            tempVector.set(0, 0, 0, 0);
            if (forwardHeld) tempVector.z -= 1;
            if (backHeld) tempVector.z += 1;
            if (leftHeld) tempVector.x -= 1;
            if (rightHeld) tempVector.x += 1;
            if (upHeld) tempVector.y += 1;
            if (downHeld) tempVector.y -= 1;
            tempVector.applyMatrix4(camera.matrixWorld);

            // apply the movement
            const delta = 60 * clock.getDelta();
            const speed = fastHeld ? this.fastSpeed : this.baseSpeed;

            camera.position.addScaledVector(Vec4To3(tempVector), speed * delta);
            this.target.addScaledVector(Vec4To3(tempVector), speed * delta);

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            this.dispatchEvent({ ...changeEvent, target: undefined });
        };

        const keyDownCallback = (e: KeyboardEvent) => {
            const key = e.key;

            if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) {
                return;
            }

            if (rafHandle === - 1) {
                originalMaxDistance = this.maxDistance;
                originalMinDistance = this.minDistance;
                originalTarget.copy(this.target);
            }

            switch (key) {
                case this.forwardKey:
                    forwardHeld = true;
                    break;
                case this.backKey:
                    backHeld = true;
                    break;
                case this.leftKey:
                    leftHeld = true;
                    break;
                case this.rightKey:
                    rightHeld = true;
                    break;
                case this.upKey:
                    upHeld = true;
                    break;
                case this.downKey:
                    downHeld = true;
                    break;
                case this.fastKey:
                    fastHeld = true;
                    break;
            }

            switch (key) {
                case this.fastKey:
                case this.forwardKey:
                case this.backKey:
                case this.leftKey:
                case this.rightKey:
                case this.upKey:
                case this.downKey:
                    e.stopPropagation();
                    e.preventDefault();
            }

            if (forwardHeld || backHeld || leftHeld || rightHeld || upHeld || downHeld || fastHeld) {
                this.minDistance = 0.01;
                this.maxDistance = 0.01;

                // Move the orbit target out to just in front of the camera
                tempVector.set(0, 0, - 1, 0).applyMatrix4(camera.matrixWorld);

                this.target.copy(camera.position).addScaledVector(Vec4To3(tempVector), 0.01);

                if (rafHandle === - 1) {
                    // start the flight and reset the clock
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    this.dispatchEvent({ ...startEvent, target: undefined });
                    clock.getDelta();
                    updateFlight();
                }
            }

        };

        const keyUpCallback = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            switch (key) {
                case this.fastKey:
                case this.forwardKey:
                case this.backKey:
                case this.leftKey:
                case this.rightKey:
                case this.upKey:
                case this.downKey:
                    e.stopPropagation();
                    e.preventDefault();
            }

            switch (key) {
                case this.forwardKey:
                    forwardHeld = false;
                    break;
                case this.backKey:
                    backHeld = false;
                    break;
                case this.leftKey:
                    leftHeld = false;
                    break;
                case this.rightKey:
                    rightHeld = false;
                    break;
                case this.upKey:
                    upHeld = false;
                    break;
                case this.downKey:
                    downHeld = false;
                    break;
                case this.fastKey:
                    fastHeld = false;
                    break;
            }

            if (!(forwardHeld || backHeld || leftHeld || rightHeld || upHeld || downHeld || fastHeld)) {
                endFlight();
            }
        };

        const blurCallback = () => {
            endFlight();
        };

        this.blurCallback = blurCallback;
        this.keyDownCallback = keyDownCallback;
        this.keyUpCallback = keyUpCallback;

        if (this.domElement) {
            this.domElement.addEventListener('blur', blurCallback);
            this.domElement.addEventListener('keydown', keyDownCallback as any);
            this.domElement.addEventListener('keyup', keyUpCallback as any);    
        }
    }

    dispose() {
        super.dispose();

        if (this.domElement) {
            this.domElement.removeEventListener('blur', this.blurCallback);
            this.domElement.removeEventListener('keydown', this.keyDownCallback as any);
            this.domElement.removeEventListener('keyup', this.keyUpCallback as any);    
        }
    }
}
