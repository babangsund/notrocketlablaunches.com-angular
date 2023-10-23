import { BatchedData } from '../../worker.model';
import { DrawingOptions } from '../line-chart2d.worker.model';
import { drawSeries } from './drawSeries';
import { drawXAxis } from './drawXAxis';
import { drawYAxisPretty } from './drawYAxis';

/**
 * Draws a line chart with the given parameters.
 *
 * @param drawChart DrawChart
 */
export function drawChart({
    ctx,
    minX,
    maxX,
    minY,
    maxY,
    prettyYInterval,
    canvasWidth,
    canvasHeight,
    chartColors,
    chartData,
    chartUnit,
}: DrawChart): void {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const drawingOptions: DrawingOptions = {
        ctx,
        minY,
        maxY,
        minX,
        maxX,
        prettyYInterval,
        canvasWidth,
        canvasHeight,
    };

    const yAxisUnit = chartUnit;

    // Labels
    ctx.font = '10px Colfax, sans-serif';
    ctx.fillStyle = '#ffffff';
    drawXAxis(drawingOptions, minX, maxX);
    drawYAxisPretty(drawingOptions, yAxisUnit);

    Object.entries(chartData).forEach(function entriesOfStoredData([property, data]) {
        if (data) {
            drawSeries(data, drawingOptions, chartColors[property]);
        }
    });
}

interface DrawChart {
    ctx: OffscreenCanvasRenderingContext2D;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    prettyYInterval: number;
    canvasWidth: number;
    canvasHeight: number;
    chartColors: Record<string, string>;
    chartData: BatchedData;
    chartUnit: string;
}
