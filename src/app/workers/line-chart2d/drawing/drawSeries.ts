import { PADDING_LEFT, PADDING_TOP } from '../constants';
import { DrawingOptions } from '../line-chart2d.worker.model';

/**
 * Draws a line series of data in a given color.
 *
 * @param data Data to draw
 * @param drawingOptions DrawingOptions
 * @param color Color of the line of data
 */
export function drawSeries(data: number[], drawingOptions: DrawingOptions, color: string): void {
    const { ctx, minY, maxY, minX, maxX, canvasWidth, canvasHeight } = drawingOptions;
    const timeRange = maxX - minX;
    const dataRange = maxY - minY;

    ctx.beginPath();
    const xScale = canvasWidth / timeRange;
    const yScale = canvasHeight / dataRange;
    for (let i = 0; i < data.length; i += 2) {
        const x = data[i];
        const y = data[i + 1];
        ctx.lineTo(
            PADDING_LEFT + timeToX(canvasWidth, x, maxX, xScale),
            PADDING_TOP + valueToY(y, maxY, yScale)
        );
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
}

function valueToY(value: number, maxValue: number, scale: number): number {
    return (maxValue - value) * scale;
}

function timeToX(canvasWidth: number, timeInMs: number, maxTime: number, scale: number): number {
    return canvasWidth - (maxTime - timeInMs) * scale;
}
