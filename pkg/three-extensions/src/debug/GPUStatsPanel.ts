import Stats from 'three/examples/jsm/libs/stats.module.js';

// https://www.khronos.org/registry/webgl/extensions/EXT_disjoint_timer_query_webgl2/
export class GPUStatsPanel extends Stats.Panel {
    maxTime: number;
    private extension: any;

    constructor(private readonly context: WebGL2RenderingContext, name = 'GPU') {
        super(name + ' (ms)', '#f90', '#210');

        const extension = context.getExtension('EXT_disjoint_timer_query_webgl2');
        if (!extension) {
            console.warn('GPUStatsPanel: disjoint_time_query extension not available.');
        }
        this.extension = extension;
        this.maxTime = 30;
    }

    startQuery() {
        const gl = this.context;
        const ext = this.extension;
        const query = gl.createQuery()!;
        gl.beginQuery(ext.TIME_ELAPSED_EXT, query);

        const checkQuery = () => {
            const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
            const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
            const ns = gl.getQueryParameter(query, gl.QUERY_RESULT);
            const ms = ns * 1e-6;

            const maxTime = this.maxTime;
            if (available) {
                if (!disjoint) {
                    this.update(ms, maxTime);
                }
            } else {
                requestAnimationFrame(checkQuery);
            }
        };
        requestAnimationFrame(checkQuery);
    }

    endQuery() {
        const ext = this.extension;
        const gl = this.context;
        gl.endQuery(ext.TIME_ELAPSED_EXT);
    }
}
