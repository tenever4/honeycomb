import { Scheduler, BEFORE_ALL_PRIORITY, RENDER_PRIORITY } from '@gov.nasa.jpl.honeycomb/scheduling-utilities';
import { Optimizer, Optimization } from '@gov.nasa.jpl.honeycomb/framerate-optimizer';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { Viewer } from './Viewer';
import { Vector2 } from 'three';

class PixelRatioOptimizer extends Optimization {
    private _min: number;
    private _max: number;
    private _increment: number;

    private _target: Viewer;

    constructor(target: Viewer, minRatio: number, maxRatio: number, steps: number) {
        super();
        this._target = target;
        this._min = Math.min(minRatio, maxRatio);
        this._max = maxRatio;
        this._increment = (this._max - this._min) / steps;
    }

    canIncreaseWork() {
        return this._target.renderer.getPixelRatio() < this._max;
    }

    canDecreaseWork() {
        return this._target.renderer.getPixelRatio() > this._min;
    }

    increaseWork() {
        let rat = this._target.renderer.getPixelRatio() + this._increment;
        rat = Math.min(rat, this._max);
        this._target.setPixelRatio(rat);
    }

    decreaseWork() {
        let rat = this._target.renderer.getPixelRatio() - this._increment;
        rat = Math.max(rat, this._min);
        this._target.setPixelRatio(rat);
    }
}

// Viewer with a framerate optimizer and composer for screen effects
type Constructor = new (...args: any) => Viewer & { dirty: boolean };
export function OptimizedViewerMixin<TBase extends Constructor>(base: TBase) {
    return class extends base {
        readonly isOptimizedViewer = true;
        fxaaPass: ShaderPass;
        bloomPass: UnrealBloomPass;
        optimizer: Optimizer;

        constructor(...args: any) {
            super(...args);

            // Shader pass setup
            const fxaaPass = new ShaderPass(FXAAShader);
            const bloomPass = new UnrealBloomPass(new Vector2(), 0.5, 0.4, 0.9);

            this.composer.addPass(fxaaPass);
            // this.composer.addPass(bloomPass);
            this.fxaaPass = fxaaPass;
            this.bloomPass = bloomPass;

            // Optimizer setup
            // Add optimizer tweaks for the render passes
            const maxPixelRatio = Math.max(window.devicePixelRatio, 1.0);
            const minPixelRatio = window.devicePixelRatio / 2.0;
            const midPixelRatio = minPixelRatio + (maxPixelRatio - minPixelRatio) / 2.0;
            const optimizer = new Optimizer({
                increaseWork: true,
                targetFramerate: 35,
                waitMillis: Infinity,
                maxWaitFrames: 5,
                interval: 500,
            });
            optimizer.waitedFrames = 20;
            optimizer.addOptimization(
                new PixelRatioOptimizer(this, minPixelRatio, midPixelRatio, 4),
                0,
            );

            // Remove the FXAA pass
            optimizer.addOptimization((d) => {
                if ((d < 0 && !fxaaPass.enabled) || (d > 0 && fxaaPass.enabled)) {
                    return false;
                }

                fxaaPass.enabled = d > 0;
                return true;
            }, 1);

            // Remove the bloom pass
            optimizer.addOptimization((d) => {
                if ((d < 0 && !bloomPass.enabled) || (d > 0 && bloomPass.enabled)) {
                    return false;
                }

                bloomPass.enabled = d > 0;
                return true;
            }, 2);

            // Scale down the internal resolution scales of the targets
            optimizer.addOptimization((d) => {
                if ((d < 0 && this.targetScale <= 1.0) || (d > 0 && this.targetScale >= 1.0)) {
                    return false;
                }

                this.setTargetScale(this.targetScale + 0.25 * Math.sign(d));
                return true;
            }, 4);

            optimizer.addOptimization(
                new PixelRatioOptimizer(this, midPixelRatio, maxPixelRatio, 4),
                4,
            );

            this.optimizer = optimizer;
            this._gpuTimeSampler.addEventListener('query-complete', (e: any) => {
                Scheduler.scheduleNextFrame(() => {
                    optimizer.addSample(e.time);
                }, RENDER_PRIORITY - 1);
            });
        }

        render() {
            // If the GPU Time Sampler isn't supported by the browser then fall back to the basic
            // render implementation.
            if (!this._gpuTimeSampler.isSupported) {
                // end the optimize time check the next frame to guarantee it runs even with an on-demand
                // dirty renderer. The optimizer _must_ run before the renderer runs next frame otherwise
                // we could get a black frame because the buffer is cleared on resize.
                this.optimizer.begin();
                Scheduler.scheduleNextFrame(() => this.optimizer.end(), BEFORE_ALL_PRIORITY);
            }

            this.fxaaPass.uniforms['resolution'].value.set(
                1 / this.internalTargetSize.x,
                1 / this.internalTargetSize.y,
            );
            super.render();
        }
    };
}
