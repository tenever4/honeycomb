export interface HoneycombUiEvent {
    time: number;
    state: {
        events: { name: string, startTime: number, endTime: number }[];
    }
}

export type TimelineDataVolumeFrames = Record<string, {
    frames: { time: number }[], color?: string
}>;
