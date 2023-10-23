import { mat4 } from 'gl-matrix';
import { linearInterpolation } from 'src/app/utils/linearInterpolation';
import { degreesToRadians } from './degreesToRadians';

/**
 * Positions the camera at the given zoom, lat and lon at an offset angle.
 *
 * @param modelViewMatrix
 * @param zoom Zoom level
 * @param lat Latitude
 * @param lon Longitude
 */
export function positionCamera(
    modelViewMatrix: mat4,
    zoom: number,
    lat: number,
    lon: number
): void {
    const rotationFactor = piecewiseInterpolation(zoom, ZOOM_LEVELS, ROTATION_FACTOR_LEVELS);
    const offsetAngle = piecewiseInterpolation(zoom, ZOOM_LEVELS, OFFSET_ANGLE_LEVELS);

    // Position camera slightly below (offsetAngle) and n units away from sphere.
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, offsetAngle, zoom]);

    // Set to default rotation (lat=0,lon=0)
    mat4.rotateY(modelViewMatrix, modelViewMatrix, degreesToRadians(90));
    // Set desired lat/lon
    mat4.rotateZ(modelViewMatrix, modelViewMatrix, degreesToRadians(lat));
    mat4.rotateY(modelViewMatrix, modelViewMatrix, degreesToRadians(-lon));

    // Tilt the camera up by n degrees.
    // Ensure the rotation axis is local to the camera by applying the tilt before other rotations.
    const tiltMatrix = mat4.create();
    mat4.rotateX(tiltMatrix, tiltMatrix, -(offsetAngle * rotationFactor));
    mat4.multiply(modelViewMatrix, tiltMatrix, modelViewMatrix); // Apply the tilt
}

/**
 * Piecewise linear interpolation. Rotation and angle factor did not
 *
 * @param zoom Zoom level
 * @param zoomLevels List of zoom levels.
 * @param factorLevels List of factor levels.
 * @returns Interpolated value
 */
function piecewiseInterpolation(
    zoom: number,
    zoomLevels: readonly number[],
    factorLevels: readonly number[]
): number {
    for (let i = 0; i < zoomLevels.length - 1; i++) {
        if (
            (zoom >= zoomLevels[i] && zoom <= zoomLevels[i + 1]) ||
            (zoom <= zoomLevels[i] && zoom >= zoomLevels[i + 1])
        ) {
            return linearInterpolation(
                zoomLevels[i],
                factorLevels[i],
                zoomLevels[i + 1],
                factorLevels[i + 1],
                zoom
            );
        }
    }
    // Should be unreachable.
    throw new Error('Zoom level out of bounds');
}

const ZOOM_LEVELS: Readonly<number[]> = [-1.2, -1.4, -1.8, -3.0];
const ROTATION_FACTOR_LEVELS: Readonly<number[]> = [1.8, 1.4, 1, 0.33];
const OFFSET_ANGLE_LEVELS: Readonly<number[]> = [
    degreesToRadians(38),
    degreesToRadians(40),
    degreesToRadians(45),
    degreesToRadians(45),
];
