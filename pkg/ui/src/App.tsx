import React, { Component, Fragment } from 'react';
import { Debouncer } from '@gov.nasa.jpl.honeycomb/scheduling-utilities';
import { LoadingManager, Viewer } from '@gov.nasa.jpl.honeycomb/core';

import HoneycombLoadWrapper from './LoadWrapper';
import { EventWatcher } from './EventWatcher';

interface HoneycombAppProps {
    viewer: Viewer;
    manager: LoadingManager;
    title?: string;
}

interface HoneycombAppState {
    errors: Error[];
}

const MANAGER_EVENTS = ['start', 'progress', 'complete', 'error'];
const ERROR_EVENTS = ['error'];
export class App extends Component<React.PropsWithChildren<HoneycombAppProps>, HoneycombAppState> {
    debouncer: Debouncer;
    displayName = 'HoneycombApp';

    constructor(props: HoneycombAppProps) {
        super(props);

        this.state = { errors: [] };

        const debouncer = new Debouncer();
        this.debouncer = debouncer;
    }

    private _forceUpdate() {
        this.debouncer.run('rerender', () => this.forceUpdate(), Infinity);
    }

    onAddError = (e: any) => {
        const errors = this.state.errors;
        let err = e.error;
        if (!(err instanceof Error)) {
            err = new Error(err);
        }

        errors.push(err);
        console.error(err);
        this.setState({ errors });
    };

    onClearErrors = () => {
        this.setState({ errors: [] });
    };

    render() {
        const state = this.state;
        const { errors } = state;

        const props = this.props;
        const { viewer, manager, title, children } = props;

        const loadPercent = manager.total === 0 ? 1.0 : Math.min(
            manager.loaded / manager.total, 1.0
        );

        return (
            <Fragment>
                <EventWatcher
                    target={manager}
                    events={MANAGER_EVENTS}
                    onEventFired={this._forceUpdate.bind(this)}
                />
                <EventWatcher
                    target={manager}
                    events={ERROR_EVENTS}
                    onEventFired={this.onAddError.bind(this)}
                />
                <EventWatcher
                    target={viewer}
                    events={ERROR_EVENTS}
                    onEventFired={this.onAddError.bind(this)}
                />
                <HoneycombLoadWrapper
                    title={title}
                    errors={errors}
                    loadPercent={loadPercent}
                    onClearErrors={this.onClearErrors.bind(this)}
                >
                    {children}
                </HoneycombLoadWrapper>
            </Fragment>
        );
    }

    componentWillUnmount() {
        // ensure we don't call force update after the component has been unmounted
        this.debouncer.cancelAll();
    }
}
