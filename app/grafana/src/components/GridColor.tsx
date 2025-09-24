import { useEffect } from 'react';
import { Color } from 'three';

import { useTheme2 } from '@grafana/ui';

import { useHoneycomb } from './Honeycomb/HoneycombContext';

export function GridColorListener() {
    const { isDark } = useTheme2();

    const { viewer } = useHoneycomb();

    useEffect(() => {
        viewer.grid.color = (
            isDark ? new Color(1, 1, 1) // white grid
                : new Color(0, 0, 0) // black grid
        )

        viewer.dirty = true;
    }, [isDark, viewer]);

    return null;
}
