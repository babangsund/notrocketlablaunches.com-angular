/**
 * Converts lat/lon to 3d cartesian coordinates.
 *
 * @param lat Latitude
 * @param lon Longitude
 * @param radius Radius of the sphere
 * @returns Cartesian coordinates `[x,y,z]`
 */
export function latLonToCartesian(
    lat: number,
    lon: number,
    radius: number
): [number, number, number] {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return [x, y, z];
}
