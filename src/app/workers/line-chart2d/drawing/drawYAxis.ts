import {
    GRID_LINE_OVERFLOW_PX,
    PADDING_LEFT,
    PADDING_TOP,
    Y_AXIS_LABEL_SPACING,
    Y_AXIS_OFFSET_MULTIPLIER,
} from '../constants';
import { DrawingOptions } from '../line-chart2d.worker.model';

/**
 * Draws the y axis label and grid line.
 * @param drawingOptions `DrawingOptions`
 * @param unit Unit to render with the Y axis value.
 */
export function drawYAxisPretty(drawingOptions: DrawingOptions, unit: string): void {
    const { ctx, minY, maxY, canvasHeight, prettyYInterval } = drawingOptions;

    const labels = [];
    // Min and max have already been prettified, so we just insert the values here.
    for (let value = minY; value <= maxY; value += prettyYInterval) {
        labels.push(value);
    }

    // Start grid
    ctx.beginPath();
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';

    // Start labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Draw grid and labels
    labels.forEach((labelValue) => {
        const valueFromMin = labelValue - minY;
        const proportionatePosition = valueFromMin / (maxY - minY);
        const yPosition = canvasHeight - proportionatePosition * canvasHeight + PADDING_TOP;

        drawLabel(
            drawingOptions,
            yPosition,
            (labelValue > 1000 ? labelValue / 1000 + 'k' : String(labelValue)) + unit
        );
        drawGridLine(drawingOptions, yPosition);
    });

    // End grid
    ctx.stroke();
}

/**
 * Returns a "prettified" interval for a given min/max y value.
 *
 * @param min Minimum Y value
 * @param max Maximum Y value
 * @param canvasHeight Height of the canvas
 * @returns pretty minY, maxY and the interval.
 */
export function getPrettyMinMaxY(
    min: number,
    max: number,
    canvasHeight: number
): { prettyMinY: number; prettyMaxY: number; prettyYInterval: number } {
    const prettyYInterval = getPrettyYInterval(min, max, canvasHeight);

    // Adjust min and max to fit the pretty interval
    const prettyMinY = Math.floor(min / prettyYInterval) * prettyYInterval;
    const prettyMaxY = Math.ceil(max / prettyYInterval) * prettyYInterval;

    return {
        prettyMinY,
        prettyMaxY,
        prettyYInterval,
    };
}

const PRETTY_INTERVALS: Readonly<number[]> = [
    1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000,
    500000, 1000000,
];

function getPrettyYInterval(min: number, max: number, canvasHeight: number): number {
    const valueRange = max - min;
    const maxLabels = Math.floor(canvasHeight / Y_AXIS_LABEL_SPACING);

    const rawInterval = valueRange / maxLabels;
    let chosenInterval = PRETTY_INTERVALS[0];

    for (const interval of PRETTY_INTERVALS) {
        if (interval >= rawInterval) {
            chosenInterval = interval;
            break;
        }
    }

    return chosenInterval;
}

function drawLabel({ ctx }: DrawingOptions, yPosition: number, labelValue: string): void {
    ctx.fillText(
        labelValue,
        PADDING_LEFT * Y_AXIS_OFFSET_MULTIPLIER - GRID_LINE_OVERFLOW_PX,
        yPosition
    );
}

function drawGridLine({ ctx, canvasWidth }: DrawingOptions, yPosition: number): void {
    ctx.moveTo(PADDING_LEFT * Y_AXIS_OFFSET_MULTIPLIER, yPosition);
    ctx.lineTo(canvasWidth + PADDING_LEFT, yPosition);
}
