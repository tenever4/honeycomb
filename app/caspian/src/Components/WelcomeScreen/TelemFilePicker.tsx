import React, { Component } from 'react';
import path from 'path';
import { Typography, Button, Tooltip, IconButton } from '@material-ui/core';
import { Clear } from '@material-ui/icons';

import { AddFileIcon } from '../CustomIcons';
import { TelemFile } from './TelemFile';
import { loadFilePaths } from '../../electron';
import * as welcomeStyles from './welcome.css';

const { ipcRenderer } = require('electron');

const LOCAL_STORAGE_KEY = 'honeycomb-settings';

export class TelemFilePicker extends Component<{}, { selectedFiles: Array<any>, spiceMetaKernel: any}> {
    constructor(props) {
        super(props);

        const prevSavedSettingsString = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        let metaKernel = null;
        if (prevSavedSettingsString) {
            const savedSettings = JSON.parse(prevSavedSettingsString);
            metaKernel = savedSettings.kernelFile;
        }

        this.state = {
            selectedFiles: [],
            spiceMetaKernel: metaKernel,
        };

        ipcRenderer.on('dropZoneClickedResp', (event, filePaths) => {
            this.setState(state => {
                const selections = state.selectedFiles.concat(filePaths);

                return { selectedFiles: selections };
            });
        });

        ipcRenderer.on('spiceClickResp', (event, filePaths) => {
            this.loadMetakernel(filePaths);
        });
    }

    handleDropZoneClick = () => {
        ipcRenderer.send('handleDropZoneClicked', '');
    };

    handleSpiceClick = () => {
        ipcRenderer.send('handleSpiceClick', '');
    }

    handleFileDrop = event => {
        // prevent web browsers default behavior when file is dropped on page
        // (tries to open that file in web page)
        event.preventDefault();
        const items = event.dataTransfer.items;
        if (items) {
            const droppedFiles = [];

            for (let i = 0, l = items.length; i < l; i++) {
                if (items[i].kind === 'file') {
                    const file = items[i].getAsFile();
                    // Only accept .rksml and .arksml files for now
                    if (
                        file.path.endsWith('.rksml') ||
                        file.path.endsWith('.arksml') ||
                        file.path.endsWith('.gltf') ||
                        file.path.endsWith('.glb') ||
                        file.path.endsWith('.dae') ||
                        file.path.endsWith('.stl') ||
                        file.path.endsWith('.fbx') ||
                        file.path.endsWith('.obj') ||
                        file.path.endsWith('.pgm') ||
                        file.path.endsWith('.mod')
                    ) {
                        droppedFiles.push(file.path);
                    }
                }
            }

            this.setState(state => {
                const selections = state.selectedFiles.concat(droppedFiles);

                return { selectedFiles: selections };
            });
        }
    };

    handleDragOver = event => {
        // needed to prevent web browser default behavior
        // (prevents data/elements from being dropped on other elements)
        event.stopPropagation();
        event.preventDefault();
    };

    handleGoClicked = () => {
        loadFilePaths(this.state.selectedFiles);
    };

    removeTelemFile = filename => {
        const index = this.state.selectedFiles.findIndex(val => {
            return path.basename(val) === filename;
        });
        if (index !== -1) {
            const prevFiles = Array.from(this.state.selectedFiles);
            prevFiles.splice(index, 1);
            this.setState({ selectedFiles: prevFiles });
        }
    };

    loadMetakernel = (filePaths) => {
        const prevSavedSettingsString = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        let savedSettings;
        if (prevSavedSettingsString) {
            savedSettings = JSON.parse(prevSavedSettingsString);
            savedSettings.kernelFile = filePaths[0];
        } else {
            savedSettings = {
                kernelFile: filePaths[0],
            };
        }
    
        try {
            window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedSettings));
        } catch (err) {
            console.error('out of memory for local storage');
            console.log(err);
        }

        this.setState({ spiceMetaKernel: filePaths[0] });
    }

    clearMetakernel = () => {
        const prevSavedSettingsString = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        let savedSettings;
        if (prevSavedSettingsString) {
            savedSettings = JSON.parse(prevSavedSettingsString);
            savedSettings.kernelFile = null;
        } else {
            savedSettings = {
                kernelFile: null,
            };
        }

        try {
            window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedSettings));
        } catch (err) {
            console.error('out of memory for local storage');
            console.log(err);
        }

        this.setState({ spiceMetaKernel: null });
    }

    render() {
        const selectedFiles = this.state.selectedFiles.map(f => {
            return (
                <TelemFile
                    fileName={path.basename(f)}
                    fullName={path.basename(f)}
                    key={path.basename(f)}
                    removeTelemFile={this.removeTelemFile}
                />
            );
        });

        const { spiceMetaKernel } = this.state;

        return (
            <div className={welcomeStyles.telemFilePicker}>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    <Button
                        variant="outlined"
                        onClick={this.handleSpiceClick}
                        style={{ marginRight: '8px' }}>
                            SPICE Kernel:
                    </Button>
                    <Tooltip title={spiceMetaKernel ? spiceMetaKernel : 'None'} placement="top" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                        <Typography
                            noWrap
                            color="textPrimary">{spiceMetaKernel ? spiceMetaKernel.split(/[\\/]/).reverse()[0] : 'None'}
                        </Typography>
                    </Tooltip>
                    {spiceMetaKernel ?
                        (<IconButton onClick={this.clearMetakernel} size="small" style={{ marginTop: 'auto', marginBottom: 'auto', marginLeft: 'auto' }}>
                            <Clear />
                        </IconButton>) :
                        null
                    }
                </div>
                {selectedFiles.length > 0 ? selectedFiles : null}
                <div style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                    <div
                        className={welcomeStyles.dropZone}
                        onClick={this.handleDropZoneClick}
                        onDrop={this.handleFileDrop}
                        onDragOver={this.handleDragOver}
                    >
                        <div className={welcomeStyles.dropZoneLabel}>
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px' }}>
                                <AddFileIcon className={welcomeStyles.addFileIcon} />
                            </div>
                            <div style={{ padding: '8px' }}>
                                <Typography variant="body1" color="textPrimary" align="center">
                                    <span className={welcomeStyles.chooseFile}>
                                        Choose files
                                    </span>{' '}
                                    or drag them here.
                                </Typography>
                                <Typography variant="body1" color="textPrimary" align="center">
                                    Accepted Files:{' '}
                                    <span className={welcomeStyles.chooseFile}>
                                        rksml, arksml, gltf, glb, dae, stl, fbx, obj, mod
                                    </span>
                                </Typography>
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Typography variant="body1" color="textSecondary">
                            Add your files and you'll be ready to
                        </Typography>
                    </div>
                    <div style={{ paddingLeft: '8px' }}>
                        <Button
                            disabled={selectedFiles.length === 0}
                            className={welcomeStyles.goButton}
                            onClick={this.handleGoClicked}
                        >
                            GO
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
}
