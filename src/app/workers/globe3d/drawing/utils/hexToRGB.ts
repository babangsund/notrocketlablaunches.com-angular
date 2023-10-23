/**
 * Converts a hex color to rgb values.
 *
 * @param hexColor Hex value `'#ffffff'`
 * @returns [r, g, b]
 */
export function hexToRGB(hexColor: string): [number, number, number] {
    const r = parseInt(hexColor.slice(1, 3), 16) / 255;
    const g = parseInt(hexColor.slice(3, 5), 16) / 255;
    const b = parseInt(hexColor.slice(5, 7), 16) / 255;
    return [r, g, b];
}
