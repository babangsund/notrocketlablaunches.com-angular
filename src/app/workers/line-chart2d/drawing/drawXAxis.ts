import {
    GRID_LINE_OVERFLOW_PX,
    PADDING_LEFT,
    PADDING_TOP,
    X_AXIS_LABEL_WIDTH,
    X_AXIS_OFFSET_MULTIPLIER,
} from '../constants';
import { DrawingOptions } from '../line-chart2d.worker.model';

/**
 * Draws an x axis with labels and grid lines.
 *
 * @param drawingOptions DrawingOptions
 * @param startTime Start of the x axis
 * @param endTime End of the x axis
 */
export function drawXAxis(
    drawingOptions: DrawingOptions,
    startTime: number,
    endTime: number
): void {
    const { ctx, canvasWidth, canvasHeight } = drawingOptions;

    const timeRange = endTime - startTime;
    const labelInterval = getLabelInterval(
        timeRange,
        drawingOptions.canvasWidth,
        X_AXIS_LABEL_WIDTH
    );

    const labels = [];
    for (let time = startTime; time <= endTime; time += labelInterval) {
        labels.push(new Date(time));
    }

    ctx.beginPath();
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    labels.forEach((labelDate) => {
        const timeFromStart = labelDate.getTime() - startTime;
        const proportionatePosition = timeFromStart / timeRange;
        const xPosition = proportionatePosition * canvasWidth + PADDING_LEFT;
        const label = formatDate(labelInterval, labelDate);
        ctx.fillText(
            label,
            xPosition,
            canvasHeight + PADDING_TOP * X_AXIS_OFFSET_MULTIPLIER + GRID_LINE_OVERFLOW_PX
        );

        // Grid line
        ctx.moveTo(xPosition, PADDING_TOP * 0.75);
        ctx.lineTo(xPosition, canvasHeight + PADDING_TOP * X_AXIS_OFFSET_MULTIPLIER);
    });

    ctx.stroke();
}

const SECOND = 1e3;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 28 * DAY;
const YEAR = 365 * DAY;

const PRETTY_TIME_INCREMENTS: Readonly<number[][]> = [
    [SECOND, 1],
    [SECOND, 5],
    [SECOND, 10],
    [SECOND, 15],
    [SECOND, 30],
    [MINUTE, 1],
    [MINUTE, 5],
    [MINUTE, 10],
    [MINUTE, 15],
    [MINUTE, 30],
    [HOUR, 1],
    [HOUR, 2],
    [HOUR, 3],
    [HOUR, 4],
    [HOUR, 6],
    [HOUR, 8],
    [HOUR, 12],
    [DAY, 1],
    [DAY, 2],
    [DAY, 3],
    [DAY, 4],
    [DAY, 5],
    [DAY, 6],
    [MONTH, 1],
    [MONTH, 2],
    [MONTH, 3],
    [MONTH, 4],
    [MONTH, 6],
    [YEAR, 1],
];

function formatDate(labelInterval: number, date: Date): string {
    if (labelInterval >= DAY) {
        return `${date.getMonth()}/${date.getDate()}`;
    }

    if (labelInterval >= HOUR) {
        return (date.getHours() % 13) + (date.getHours() > 12 ? 'pm' : 'am');
    }

    if (labelInterval >= MINUTE) {
        return `${date.getHours()}:${date.getMinutes()}`;
    }

    if (labelInterval >= SECOND) {
        return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    }

    return `${date.getHours()}:${date.getMinutes()}`;
}

function getLabelInterval(timeRange: number, canvasWidth: number, labelWidth: number): number {
    let interval = SECOND;

    const maxLabels = Math.floor(canvasWidth / labelWidth);
    const requiredInterval = timeRange / maxLabels;

    for (const [time, multiplier] of PRETTY_TIME_INCREMENTS) {
        if (time * multiplier >= requiredInterval) {
            interval = time * multiplier;
            break;
        }
    }

    return interval;
}
