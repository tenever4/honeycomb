import React from 'react';
import { LoadingBar } from '@grafana/ui';
import styled, { type StyledComponent } from '@emotion/styled';

function wrapHidden<T extends object, J extends object>(c: StyledComponent<T, J>) {
    return styled(c, { shouldForwardProp: (prop: string) => prop !== 'hidden' })<{ hidden?: boolean }>(({ hidden }) => ({
        ...(hidden && {
            display: 'none'
        })
    }));
}

const LoadingWrapper = wrapHidden(styled.div`
    display: block;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    z-index: 1;
    background-color: rgba(255, 255, 255, 0);
`);

// Displays a loading bar until everything is loaded then displays the viewer
const HoneycombLoadWrapper: React.FC<React.PropsWithChildren<{
    title?: string;
    loadPercent: number;
    errors: Error[];
    onClearErrors: () => void;
}>> = (props) => {
    const { loadPercent, children } = props;
    const ratio = loadPercent || 0;
    const fullyLoaded = ratio >= 1.0;
    if (fullyLoaded) {
        return (
            <React.Fragment>
                {children}
            </React.Fragment>
        );
    } else {
        return (
            <LoadingWrapper hidden={fullyLoaded}>
                <LoadingBar width={80} delay={200} />
            </LoadingWrapper>
        );
    }
}

export default HoneycombLoadWrapper;
