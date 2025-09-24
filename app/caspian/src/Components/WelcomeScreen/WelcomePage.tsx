import React, { Component } from 'react';
import { Typography } from '@material-ui/core';

import { GettingStarted } from './GettingStarted';
import { TelemFilePicker } from './TelemFilePicker';

import { appVersion } from '../version';

import * as welcomeStyles from './welcome.css';

export class WelcomePage extends Component {
    render() {
        return (
            <div className={welcomeStyles.root}>
                <div className={welcomeStyles.main}>
                    <div className={welcomeStyles.welcomeHeader}>
                        <div>
                            <div>
                                <Typography variant="h1" color="textPrimary">
                                    Caspian - Powered by Honeycomb
                                </Typography>
                            </div>
                            <div>
                                <Typography variant="subtitle1" color="textSecondary">
                                    {(window as any).env?.version||appVersion}
                                </Typography>
                            </div>
                        </div>
                        <div className={welcomeStyles.welcomeBody}>
                            <div style={{ width: '50%' }}>
                                <div style={{ paddingBottom: '8px' }}>
                                    <Typography variant="h2" color="textPrimary">
                                        Add your telemetry data
                                    </Typography>
                                </div>
                                <div style={{ width: '60%' }}>
                                    <TelemFilePicker />
                                </div>
                            </div>
                            <div style={{ width: '50%' }}>
                                <GettingStarted />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
