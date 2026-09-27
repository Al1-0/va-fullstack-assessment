const EMULATOR_URL = process.env.EMULATOR_URL || 'http://localhost:3001';

export interface SensorMetaData {
    sensorId: number;
    sensorName: string;
    unit: string;
}

export interface SensorReading {
    sensorId: number;
    value: number;
    timestamp: number;
}

type Range = {min: number, max: number};

const sensorRangeRecord: Map<string, Range> = new Map ([
    ["BATTERY_TEMPERATURE", {min: 20, max: 80}],
    ["MOTOR_TEMPERATURE", {min: 30, max: 120}],
    ["TYRE_PRESSURE_FL", {min: 150, max: 250}],
    ["TYRE_PRESSURE_FR", {min: 150, max: 250}],
    ["TYRE_PRESSURE_RL", {min: 150, max: 250}],
    ["TYRE_PRESSURE_RR", {min: 150, max: 250}],
    ["PACK_CURRENT", {min: -300, max: 300}],
    ["PACK_VOLTAGE", {min: 350, max: 500}],
    [ "PACK_SOC", {min: 0, max: 100}],
    ["VEHICLE_SPEED", {min: 0, max: 250}],
    ["STEERING_ANGLE", {min: -180, max: 180}],
    ["BRAKE_PRESSURE_FRONT", {min: 0, max: 120}]
])

let metadata: SensorMetaData[] = [];

// load meta data into cache 
export async function loadSensorMetadata(): Promise<void> {
    const res = await fetch(`${EMULATOR_URL}/sensors`);
    if (!res.ok) {
        throw new Error(`Sensor Metadata Response Status: ${res.status}`);
    }

    try {

        metadata = await res.json();
    } catch (error) {
        console.log(error)
    }
}

export function getSensorMetaData(sensorId: number): SensorMetaData | undefined {
    return metadata.find(entry => entry.sensorId === sensorId)
}

export function getAllSensorMetaData(): SensorMetaData[] {
    return metadata;
}



// returns whether a reading is valid or invalid
export function isValid(reading: SensorReading): boolean {
    
    // necessary fields missing
    if (reading?.sensorId === undefined || 
        reading?.value === undefined || 
        reading.timestamp === undefined) {
        console.log('missing field(s)');
        return false;
    }

    // too many/few fields
    if (Object.keys(reading).length !== 3) {
        console.log('too many or few fields');
        return false;
    }

    if (typeof reading.sensorId !== 'number' 
        || typeof reading.value !== 'number' 
        || typeof reading.timestamp !== 'number') {
        console.log('reading data types were not valid')
        return false;
    }

    return true;
}

// determine if the sensor readin is out of range
export function inRange(reading: SensorReading): boolean {

    const metaData = getSensorMetaData(reading.sensorId);
    if (!metaData) {
        console.log(`sensorId from reading ${reading.sensorId} not found`)
        return false;
    }

    const range = sensorRangeRecord.get(metaData.sensorName)
    if (!range) return false;

    if (reading.value > range.max || reading.value < range.min) {
        return false;
    }

    return true;
}