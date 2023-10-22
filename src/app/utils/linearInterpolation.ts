export function linearInterpolation(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x: number
): number {
    return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
}
