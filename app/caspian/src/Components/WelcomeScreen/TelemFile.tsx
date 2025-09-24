import React, { Component } from 'react';
import { Typography, IconButton, Tooltip } from '@material-ui/core';
import { Clear, Terrain } from '@material-ui/icons';

import { FileIcon } from '../CustomIcons';
import * as welcomeStyles from './welcome.css';

type TelemFileProps = { 
    fileName: string;
    fullName: string; 
    removeTelemFile: (string) => any;
 };

export class TelemFile extends Component<TelemFileProps, { hovering: boolean }> {
    constructor(props) {
        super(props);

        this.state = {
            hovering: false,
        };
    }

    handleOnMouseOver = () => {
        this.setState({ hovering: true });
    };

    handleOnMouseLeave = () => {
        this.setState({ hovering: false });
    };

    handleDelete = () => {
        this.props.removeTelemFile(this.props.fullName);
    };

    render() {
        const { fileName, fullName } = this.props;
        const isTerrainFile =
            fileName.endsWith('gltf') ||
            fileName.endsWith('glb') ||
            fileName.endsWith('dae') ||
            fileName.endsWith('stl') ||
            fileName.endsWith('fbx') ||
            fileName.endsWith('obj') ||
            fileName.endsWith('pgm');

        return (
            <div
                onMouseOver={this.handleOnMouseOver}
                onMouseLeave={this.handleOnMouseLeave}
            >
                <div style={{ display: 'flex', alignItems: 'center', padding: '4px' }}>
                    {isTerrainFile ? (
                        <Terrain className={welcomeStyles.fileIcon} />
                    ) : (
                        <FileIcon className={welcomeStyles.fileIcon} />
                    )}
                    <div style={{ width: '90%' }}>
                        <Tooltip title={fullName ? fullName : fileName} placement="top">
                            <Typography variant="body1" color="textSecondary" noWrap>
                                {fileName}
                            </Typography>
                        </Tooltip>
                    </div>
                    <div style={{ visibility: this.state.hovering ? 'visible' : 'hidden' }}>
                        <IconButton onClick={this.handleDelete} size="small">
                            <Clear />
                        </IconButton>
                    </div>
                </div>
            </div>
        );
    }
}
