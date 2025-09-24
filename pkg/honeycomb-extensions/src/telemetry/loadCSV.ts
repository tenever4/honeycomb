import { Frame } from '@gov.nasa.jpl.honeycomb/common';
import { LoadingManager } from '@gov.nasa.jpl.honeycomb/core';
import { KinematicState, RobotState, TelemetryAnimator } from '@gov.nasa.jpl.honeycomb/telemetry-animator';
import { TransformAnimator } from './TransformAnimator';

function csvToJson(csv: string) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',');
  const result: Array<Frame<KinematicState>> = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue; // Skip empty lines
    const values = lines[i].split(',');
    const robotState: RobotState = {
        x: 0,
        y: 0,
        z: 0,
        qx: 0,
        qy: 0,
        qz: 0,
        qw: 0
    };

    let time = 0;
    let robot = 'robot';
    for (let j = 0; j < headers.length; j++) {
        const key: string = headers[j];
        if (key === 'time') {
            time = parseFloat(values[j]);
        } else if (key === 'robot') {
            robot = values[j];
        } else {
            robotState[key] = parseFloat(values[j]);
        }
    }

    result.push({
        time: time,
        state: {
            [robot]: robotState
        }
    });
  }
  return result;
}

async function loadCSV(paths: string[], options: any, manager: LoadingManager) {
    const resolvedPaths = paths.map(p => manager.resolveURL(p));
    const data = await Promise.all(
        resolvedPaths.map(p => {
            return fetch(p, { credentials: 'same-origin' })
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`CSVLoader: Failed to load file "${p}" with status ${res.status} : ${res.statusText}`);
                    }
                    return res.text();
                })
                .then(txt => csvToJson(txt));
        }),
    );

    const frames = data.flat();
    frames.sort((a, b) => a.time - b.time);

    const anim = new TransformAnimator(frames);
    anim.continuous = true;
    anim.interpolate = true;
    anim.optimize();
    return anim;
}

export { loadCSV };