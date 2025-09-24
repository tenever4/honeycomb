// import { css } from '@emotion/css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import { arrayToDataFrame, type DataFrame, DataTopic } from '@grafana/data';
import type { TimeZone } from '@grafana/schema';
import { getPortalContainer, useTheme2 } from '@grafana/ui';

import { AnnotationMarker2 } from './AnnotationMarker2';

// (copied from TooltipPlugin2)
interface TimeRange2 {
    from: number;
    to: number;
}

interface AnnotationsPluginProps {
    annotations: DataFrame[];
    timeZone: TimeZone;
    timeRange: TimeRange2;
    newRange: TimeRange2 | null;
    setNewRange: (newRage: TimeRange2 | null) => void;
}

const DEFAULT_ANNOTATION_COLOR_HEX8 = "#00d3ff";

// TODO: batch by color, use Path2D objects
// const renderLine = (ctx: CanvasRenderingContext2D, y0: number, y1: number, x: number, color: string) => {
//     ctx.beginPath();
//     ctx.moveTo(x, y0);
//     ctx.lineTo(x, y1);
//     ctx.strokeStyle = color;
//     ctx.stroke();
// };

// const renderUpTriangle = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
//     ctx.beginPath();
//     ctx.moveTo(x - w / 2, y + h / 2);
//     ctx.lineTo(x + w / 2, y + h / 2);
//     ctx.lineTo(x, y);
//     ctx.closePath();
//     ctx.fillStyle = color;
//     ctx.fill();
// }

function getVals(frame: DataFrame) {
    let vals: Record<string, any[]> = {};
    frame.fields.forEach((f) => {
        vals[f.name] = f.values;
    });

    return vals;
}

export const AnnotationsPlugin2 = ({
    annotations,
    timeZone,
    timeRange,
    newRange,
    setNewRange,
}: AnnotationsPluginProps) => {
    const [portalRoot] = useState(() => getPortalContainer());
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // const styles = useStyles2(getStyles);
    const getColorByName = useTheme2().visualization.getColorByName;

    // const [_, forceUpdate] = useReducer((x) => x + 1, 0);

    const annos = useMemo(() => {
        let annos = annotations.filter(
            (frame) => frame.name !== 'exemplar' && frame.length > 0 && frame.fields.some((f) => f.name === 'time')
        );

        if (newRange) {
            let isRegion = newRange.to > newRange.from;

            const wipAnnoFrame = arrayToDataFrame([
                {
                    time: newRange.from,
                    timeEnd: isRegion ? newRange.to : null,
                    isRegion: isRegion,
                    color: DEFAULT_ANNOTATION_COLOR_HEX8,
                },
            ]);

            wipAnnoFrame.meta = {
                dataTopic: DataTopic.Annotations,
                custom: {
                    isWip: true,
                },
            };

            annos.push(wipAnnoFrame);
        }

        return annos;
    }, [annotations, newRange]);

    const exitWipEdit = useCallback(() => {
        setNewRange(null);
    }, [setNewRange]);

    const annoRef = useRef(annos);
    annoRef.current = annos;
    const newRangeRef = useRef(newRange);
    newRangeRef.current = newRange;

    const xAxisRef = useRef<HTMLDivElement>();

    useEffect(() => {
        let annos = annoRef.current;
        const c = canvasRef.current;
        const ctx = c?.getContext('2d');

        if (c && ctx) {
            const bbox = c.getBoundingClientRect();

            // const timeToPos = (t: number) => {

            // }

            ctx.save();

            ctx.beginPath();
            ctx.rect(bbox.left, bbox.top, bbox.width, bbox.height);
            ctx.clip();

            annos.forEach((frame) => {
                // let vals = getVals(frame);

                // let y0 = bbox.top;
                // let y1 = y0 + bbox.height;

                // ctx.lineWidth = 2;
                // ctx.setLineDash([5, 5]);

                // for (let i = 0; i < vals.time.length; i++) {
                //     let color = getColorByName(vals.color?.[i] || DEFAULT_ANNOTATION_COLOR_HEX8);

                //     let x0 = timeToPos(vals.time[i], 'x', true);

                //     if (!vals.isRegion?.[i]) {
                //         renderLine(ctx, y0, y1, x0, color);
                //         renderUpTriangle(ctx, x0, y1, 8 * uPlot.pxRatio, 5 * uPlot.pxRatio, color);
                //     } else if (canvasRegionRendering) {
                //         renderLine(ctx, y0, y1, x0, color);

                //         let x1 = timeToPos(vals.timeEnd[i], 'x', true);

                //         renderLine(ctx, y0, y1, x1, color);

                //         ctx.fillStyle = colorManipulator.alpha(color, 0.1);
                //         ctx.fillRect(x0, y0, x1 - x0, u.bbox.height);
                //     }
                // }
            });

            ctx.restore();
        }
    }, [annos, getColorByName]);

    let markers = annos.flatMap((frame, frameIdx) => {
        let vals = getVals(frame);

        let markers: React.ReactNode[] = [];

        for (let i = 0; i < vals.time.length; i++) {
            // let color = getColorByName(vals.color?.[i] || DEFAULT_ANNOTATION_COLOR);
            // let left = Math.round(plot.valToPos(vals.time[i], 'x')) || 0; // handles -0
            let style: React.CSSProperties | null = null;
            let className = '';
            let isVisible = true;

            // if (vals.isRegion?.[i]) {
            //     let right = Math.round(plot.valToPos(vals.timeEnd?.[i], 'x')) || 0; // handles -0

            //     isVisible = left < plot.rect.width && right > 0;

            //     if (isVisible) {
            //         let clampedLeft = Math.max(0, left);
            //         let clampedRight = Math.min(plot.rect.width, right);

            //         style = { left: clampedLeft, background: color, width: clampedRight - clampedLeft };
            //         className = styles.annoRegion;
            //     }
            // } else {
            //     isVisible = left >= 0 && left <= plot.rect.width;

            //     if (isVisible) {
            //         style = { left, borderBottomColor: color };
            //         className = styles.annoMarker;
            //     }
            // }

            // @TODO: Reset newRange after annotation is saved
            if (isVisible) {
                let isWip = frame.meta?.custom?.isWip;

                markers.push(
                    <AnnotationMarker2
                        annoIdx={i}
                        annoVals={vals}
                        className={className}
                        style={style}
                        timeZone={timeZone}
                        key={`${frameIdx}:${i}`}
                        exitWipEdit={isWip ? exitWipEdit : null}
                        portalRoot={portalRoot}
                    />
                );
            }
        }

        return markers;
    });

    return (
        <React.Fragment>
            {createPortal(markers, xAxisRef.current!)}
            <canvas ref={canvasRef} />
        </React.Fragment>
    );
};

// const getStyles = () => ({
//     annoMarker: css({
//         position: 'absolute',
//         width: 0,
//         height: 0,
//         borderLeft: '5px solid transparent',
//         borderRight: '5px solid transparent',
//         borderBottomWidth: '5px',
//         borderBottomStyle: 'solid',
//         transform: 'translateX(-50%)',
//         cursor: 'pointer',
//         zIndex: 1,
//     }),
//     annoRegion: css({
//         position: 'absolute',
//         height: '5px',
//         cursor: 'pointer',
//         zIndex: 1,
//     }),
// });
