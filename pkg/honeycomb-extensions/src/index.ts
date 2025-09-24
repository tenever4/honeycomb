import { Loaders } from '@gov.nasa.jpl.honeycomb/core';
import { loadGLTF } from './models/gltfModelLoader';
import { loadCollada } from './models/colladaModelLoader';
import { loadSTL } from './models/stlModelLoader';
import { loadFBX } from './models/fbxModelLoader';
import { loadObj } from './models/objModelLoader';
import { loadURDF } from './models/urdfModelLoader';
import { loadXacro } from './models/xacroModelLoader';
import { loadVicarHeightMap } from './models/vicarModelLoader';
import { loadPGMHeightMap } from './models/pgmModelLoader';
import { loadGeoTiff } from './models/geoTiffModelLoader';

export * from './drivers/KinematicsDriver';
export * from './drivers/AnnotationDriver';

import {
    loadSGITextureFunction,
    loadPGMTextureFunction,
    loadTextureFunction,
} from './textures/loadTextureFunctions';

import { loadRos } from './telemetry/loadRos.js';
import { loadCSV } from './telemetry/loadCSV';
import { loadRKSML } from './telemetry/loadRKSML.js';
import { loadARKSML } from './telemetry/loadARKSML.js';
import { loadM20EnavArksml } from './telemetry/loadM20EnavArksml.js';
import { loadM20EnavImgs } from './telemetry/loadM20EnavImgs.js';

export function registerCommonLoaders() {
    Loaders.registerDriver('CameraDisplayDriver', async (options, manager) => {
        const { CameraDisplayDriver } = await import('./drivers/CameraDisplayDriver');
        return new CameraDisplayDriver(options, manager);
    });

    Loaders.registerDriver('TilesRendererDriver', async (options, manager) => {
        const { TilesRendererDriver } = await import('./drivers/TilesRendererDriver');
        return new TilesRendererDriver(options, manager);
    });

    Loaders.registerDriver('RosDriver', async ( options, manager ) => {
        const { RosDriver } = await import('./drivers/RosDriver.js');
        return new RosDriver(options, manager);
    });

    Loaders.registerDriver('KinematicsDriver', async ( options, manager ) => {
        const { KinematicsDriver } = await import('./drivers/KinematicsDriver');
        return new KinematicsDriver(manager, options);
    });

    Loaders.registerDriver('ArksmlDriver', async ( options, manager ) => {
        const { ArksmlDriver } = await import('./drivers/ArksmlDriver.js');
        return new ArksmlDriver(options, manager);
    });

    Loaders.registerDriver('MarsSkyDriver', async ( options, manager ) => {
        const { MarsSkyDriver } = await import('./drivers/MarsSkyDriver.js');
        return new MarsSkyDriver(options, manager);
    });

    Loaders.registerDriver('EnavArksmlDriver', async ( options, manager ) => {
        const { EnavArksmlDriver } = await import('./drivers/EnavArksmlDriver.js');
        return new EnavArksmlDriver(options, manager);
    });

    Loaders.registerTelemetryAnimatorLoader('m20-enav-arksml', loadM20EnavArksml);

    Loaders.registerTelemetryAnimatorLoader('m20-enav-imgs', loadM20EnavImgs);

    Loaders.registerDriver('RksmlDriver', async ( options, manager ) => {
        const { RksmlDriver } = await import('./drivers/RksmlDriver.js');
        return new RksmlDriver(options, manager);
    });

    Loaders.registerDriver('RobotKinematicsDriver', async ( options, manager ) => {
        const { RobotKinematicsDriver } = await import('./drivers/RobotKinematicsDriver.js');
        return new RobotKinematicsDriver(manager, options);
    });

    Loaders.registerTelemetryAnimatorLoader(['ros', 'rosbag'], loadRos);

    Loaders.registerTelemetryAnimatorLoader('csv', loadCSV);
    Loaders.registerTelemetryAnimatorLoader('rksml', loadRKSML);
    Loaders.registerTelemetryAnimatorLoader('arksml', loadARKSML);

    // register model loaders
    Loaders.registerModelLoader({
        name: 'GTLF',
        description: 'Supports binary .glb and text JSON .gtlf',
        ext: ['gltf', 'glb'],
        load: loadGLTF
    });

    Loaders.registerModelLoader({
        name: 'Collada',
        ext: 'dae',
        load: loadCollada
    });

    Loaders.registerModelLoader({
        name: 'STL',
        description: 'Raw mesh (no textures)',
        ext: 'stl',
        load: loadSTL
    });

    Loaders.registerModelLoader({
        name: 'FBX',
        ext: 'fbx',
        load: loadFBX
    });

    Loaders.registerModelLoader({
        name: 'OBJ',
        ext: 'obj',
        load: loadObj
    });

    Loaders.registerModelLoader({
        name: 'URDF',
        description: 'ROS2 Unified Robotics Description Format',
        ext: 'urdf',
        load: loadURDF,
        optionSchema: {
            type: "object",
            properties: {
                ignoreJointLimits: {
                    type: "boolean",
                    title: "Ignore Joint Limits",
                    description: "Allow unbounded joints motion in visualization",
                    default: false
                },
                parseVisual: {
                    type: "boolean",
                    title: "Visual",
                    description: "Load the visual mesh",
                    default: true
                },
                parseCollision: {
                    type: "boolean",
                    title: "Collision",
                    description: "Load the collision volume",
                    default: true
                },
                packages: {
                    type: "object",
                    title: "Packages",
                    description: "Handles 'package://' entries in the URDF",
                    additionalProperties: { type: "string" }
                }
            }
        }
    });

    Loaders.registerModelLoader({
        name: 'XACRO (URDF)',
        description: 'Macro XML that wraps a URDF',
        ext: 'xacro',
        load: loadXacro
    });

    Loaders.registerModelLoader({
        name: 'VICAR',
        description: 'VICAR Heightmap',
        ext: 'ht',
        load: loadVicarHeightMap
    });

    Loaders.registerModelLoader({
        name: 'PGM',
        description: 'Portable graymap file for text-based heightmap',
        ext: 'pgm',
        load: loadPGMHeightMap
    });

    Loaders.registerModelLoader({
        name: 'GeoTIFF',
        description: 'GeoTIFF Textured heightmaps',
        ext: 'tif',
        load: loadGeoTiff
    });

    // register texture loaders
    Loaders.registerTextureLoader('rgb', loadSGITextureFunction);

    Loaders.registerTextureLoader('pgm', loadPGMTextureFunction);

    Loaders.registerTextureLoader(['png', 'jpg', 'jpeg'], loadTextureFunction);
}
