// This script simulates a rover moving and turning, and records its position and orientation
// to a CSV file. It uses three.js for 3D math calculations (Vector3 and Quaternion).
// To run this script:
// 1. Make sure you have Node.js installed.
// 2. Install the three.js library: npm install three
// 3. Run the script: node rover_simulation.js

const THREE = require('three');
const fs = require('fs');

// Simulation parameters
const DURATION_SECONDS = 300; // Total simulation time in seconds
const TIMESTEP_MS = 100; // Time interval between each data point in milliseconds
const ROVER_SPEED_MPH = 0.07456; // Rover's speed in miles per hour
const ANGULAR_VELOCITY_DEG_PER_SEC = 1; // Rover's turning rate in degrees per second

// Conversion factors
const MPH_TO_METERS_PER_SECOND = 0.44704;
const DEG_TO_RAD = Math.PI / 180;

// Calculate rover speed and angular velocity in standard units
const roverSpeedMps = ROVER_SPEED_MPH * MPH_TO_METERS_PER_SECOND;
const angularVelocityRadPerSec = ANGULAR_VELOCITY_DEG_PER_SEC * DEG_TO_RAD;

// Initialize rover's state
const roverPosition = new THREE.Vector3(0, 0, 0); // Starting at the origin
const roverQuaternion = new THREE.Quaternion(0, 0, 0, 1); // Initial orientation (no rotation)

// Array to store the pose data
const poseData = [];

// --- Simulation Timing & Metadata ---
const simulationStartTime = new Date();
const simulationStopTime = new Date(simulationStartTime.getTime() + DURATION_SECONDS * 1000);
const simulationStartTimeISO = simulationStartTime.toISOString();
const simulationStopTimeISO = simulationStopTime.toISOString();

// Define metadata for each measurement component
const components = {
    position_x: { _measurement: 'pose_position_X', id: Math.floor(10000 + Math.random() * 90000), table: 0 },
    position_y: { _measurement: 'pose_position_Y', id: Math.floor(10000 + Math.random() * 90000), table: 1 },
    position_z: { _measurement: 'pose_position_Z', id: Math.floor(10000 + Math.random() * 90000), table: 2 },
    quaternion_x: { _measurement: 'pose_orientation_X', id: Math.floor(10000 + Math.random() * 90000), table: 3 },
    quaternion_y: { _measurement: 'pose_orientation_Y', id: Math.floor(10000 + Math.random() * 90000), table: 4 },
    quaternion_z: { _measurement: 'pose_orientation_Z', id: Math.floor(10000 + Math.random() * 90000), table: 5 },
    quaternion_w: { _measurement: 'pose_orientation_W', id: Math.floor(10000 + Math.random() * 90000), table: 6 },
};


// --- Simulation Loop ---
console.log('Starting rover simulation...');

// The simulation runs for the specified duration, with a defined timestep.
for (let time = 0; time <= DURATION_SECONDS * 1000; time += TIMESTEP_MS) {
    const deltaTimeSeconds = TIMESTEP_MS / 1000;
    const recordTime = new Date(simulationStartTime.getTime() + time).toISOString();

    // --- Update Rover Orientation ---
    // Calculate the small rotation for this timestep.
    // We are rotating around the Z-axis (out of the screen) to simulate turning on the XY plane.
    const rotationAxis = new THREE.Vector3(0, 0, 1); 
    const rotationAngle = angularVelocityRadPerSec * deltaTimeSeconds;
    const deltaRotation = new THREE.Quaternion().setFromAxisAngle(rotationAxis, rotationAngle);

    // Apply the rotation to the rover's main quaternion and normalize it
    roverQuaternion.multiply(deltaRotation).normalize();

    // --- Update Rover Position ---
    // Determine the rover's current forward direction based on its orientation.
    // The initial forward direction is along the positive X-axis.
    const forwardDirection = new THREE.Vector3(1, 0, 0);
    forwardDirection.applyQuaternion(roverQuaternion);

    // Calculate the velocity vector for this timestep
    const roverVelocity = forwardDirection.multiplyScalar(roverSpeedMps);

    // Calculate the displacement (distance moved) for this timestep
    const displacement = roverVelocity.clone().multiplyScalar(deltaTimeSeconds);
    roverPosition.add(displacement);

    // --- Record Data ---
    // A helper function to create a data row in the desired format
    const createDataRow = (value, componentMeta) => ({
        result: '',
        table: componentMeta.table,
        _start: simulationStartTimeISO,
        _stop: simulationStopTimeISO,
        _time: recordTime,
        _value: value,
        _field: 'value',
        _measurement: componentMeta._measurement,
        component: 'navigation',
        id: componentMeta.id,
        name: componentMeta._measurement,
        source: 'rover'
    });
    
    poseData.push(createDataRow(roverPosition.x, components.position_x));
    poseData.push(createDataRow(roverPosition.y, components.position_y));
    poseData.push(createDataRow(roverPosition.z, components.position_z));
    poseData.push(createDataRow(roverQuaternion.x, components.quaternion_x));
    poseData.push(createDataRow(roverQuaternion.y, components.quaternion_y));
    poseData.push(createDataRow(roverQuaternion.z, components.quaternion_z));
    poseData.push(createDataRow(roverQuaternion.w, components.quaternion_w));
}

console.log('Simulation finished.');

// --- CSV Generation ---
console.log('Generating CSV file...');

// Define the header for the CSV file
const header = '#group,false,false,true,true,false,false,true,true,true,true,true,true\n' +
'#datatype,string,long,dateTime:RFC3339,dateTime:RFC3339,dateTime:RFC3339,double,string,string,string,string,string,string\n' +
'#default,_result,,,,,,,,,,,\n'
+',result,table,_start,_stop,_time,_value,_field,_measurement,component,id,name,source\n';

// Convert the pose data array into a CSV-formatted string
const csvRows = poseData.map(row => 
    `,${row.result},${row.table},${row._start},${row._stop},${row._time},${row._value},${row._field},${row._measurement},${row.component},${row.id},${row.name},${row.source}`
);

const csvContent = header + csvRows.join('\n');

// Write the CSV content to a file
const outputFileName = 'drive.csv';
fs.writeFile(outputFileName, csvContent, (err) => {
    if (err) {
        console.error('Error writing to CSV file:', err);
    } else {
        console.log(`Successfully saved pose data to ${outputFileName}`);
    }
});
