import React, { Component } from 'react';
import { Typography } from '@material-ui/core';
import { Help } from '@material-ui/icons';
import { shell } from 'electron';

import * as welcomeStyles from './welcome.css';
import { BugIcon } from '../CustomIcons';

function openBugPage() {
    shell.openExternal(
        'https://github.com/nasa-jpl/honeycomb/issues/new?assignees=&labels=bug&template=---bug-report.md&title=',
    );
}

function openRepoPage() {
    shell.openExternal('https://github.com/nasa-jpl/honeycomb');
}

export class GettingStarted extends Component {
    render() {
        return (
            <div style={{ padding: '8px' }}>
                <div style={{ padding: '8px' }}>
                    <Typography variant="h2" color="textPrimary">
                        Getting started with Honeycomb
                    </Typography>
                </div>
                <div className={welcomeStyles.gettingStartedEntry} style={{ padding: '8px' }}>
                    <Help className={welcomeStyles.helpIcon}/>
                    <Typography variant="body1" color="textSecondary">
                        We're #honeycomb-support on{' '}
                        <a className={welcomeStyles.link} onClick={openRepoPage}>
                            GitHub
                        </a>
                        !
                    </Typography>
                </div>
                <div className={welcomeStyles.gettingStartedEntry} style={{ padding: '8px' }}>
                    <div>
                        <BugIcon className={welcomeStyles.bugIcon} />
                    </div>
                    <div>
                        <Typography variant="body1" color="textSecondary">
                            <a className={welcomeStyles.link} onClick={openBugPage}>
                                File a bug
                            </a>{' '}
                            or{' '}
                            <a className={welcomeStyles.link} onClick={openRepoPage}>
                                visit our github
                            </a>{' '}
                            repo.
                        </Typography>
                    </div>
                </div>
            </div>
        );
    }
}
