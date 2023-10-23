import { MissionDataProperty } from 'src/app/data/data.model';
import { loadFontFaceSet } from 'src/app/utils/loadFontFaceSet';
import { FromSimulatorToSubscriberEvent } from '../simulator/simulator.worker.model';
import { ResizeEvent, StartEvent } from '../timeline2d/timeline2d.worker.model';
import { BatchedData } from '../worker.model';
import { PADDING_BOTTOM, PADDING_LEFT, PADDING_RIGHT, PADDING_TOP } from './constants';
import { drawChart } from './drawing/drawChart';
import { getPrettyMinMaxY } from './drawing/drawYAxis';

export class LineChart2d {
    /**
     * Loads the font face set.
     * The promise is used to block rendering until fonts are ready.
     *
     * @private
     */
    private static readonly _fontFaceSet = loadFontFaceSet(self.fonts, ['colfax']);
    /**
     * Canvas for rendering the line chart.
     *
     * @private
     */
    private _offscreenCanvas: OffscreenCanvas | null = null;
    /**
     * All data this class has received in its lifetime.
     * We assume all data is received in chronological order and without duplicates.
     * (Something we could handle in our streaming platform, e.g. Kafka)
     *
     * @private
     */
    private _storedData: BatchedData = {};
    /**
     * Minimum Y value of the line chart.
     *
     * @private
     */
    private _minY = NaN;
    /**
     * Maximum Y value of the line chart.
     *
     * @private
     */
    private _maxY = NaN;
    /**
     * Minimum X value of the line chart.
     *
     * @private
     */
    private _minX = NaN;
    /**
     * Maximum X value of the line chart.
     *
     * @private
     */
    private _maxX = NaN;
    /**
     * Current animation frame
     *
     * @private
     */
    private _frame: number | null = null;
    /**
     * Unit of the line chart y axis.
     *
     * @private
     */
    private _unit = '';
    /**
     * Device pixel ratio.
     *
     * @private
     */
    private _dpr = 1;
    /**
     * Canvas rendering context.
     *
     * @private
     */
    private _ctx: OffscreenCanvasRenderingContext2D | null = null;
    /**
     * Colors for the mission data properties.
     *
     * @private
     */
    private _colors: Record<MissionDataProperty, string> = {};
    /**
     * Actual canvas width (divided by dpr, minus padding).
     *
     * @private
     */
    private _canvasWidth = 0;
    /**
     * Actual canvas height (divided by dpr, minus padding).
     *
     * @private
     */
    private _canvasHeight = 0;
    /**
     * Initializes the line chart with given parameters.
     *
     * @param evt The event object.
     * @param evt.port Message port for communication.
     * @param evt.dpr Device pixel ratio.
     * @param evt.unit Unit of the Y-axis.
     * @param evt.colors Color map for each mission data property.
     * @param evt.offscreenCanvas Canvas for rendering the line chart.
     * @private
     */
    public start(evt: StartEvent): void {
        void this._start(evt);
    }
    /**
     * Handles resizing of the line chart.
     *
     * @param evt The event object.
     * @param evt.width Width of the canvas
     * @param evt.height Height of the canvas
     * @private
     */
    public resize(evt: ResizeEvent): void {
        if (this._offscreenCanvas) {
            this._offscreenCanvas.width = evt.width;
            this._offscreenCanvas.height = evt.height;
            this._ctx = this._offscreenCanvas?.getContext('2d');
            const ctx = this._ctx;
            if (!ctx) return;
            this._updateScaleAndDimensions();
        }
    }
    /**
     * Internal method to start the line chart visualization.
     *
     * @param evt The event object.
     * @param evt.port Message port for communication.
     * @param evt.dpr Device pixel ratio.
     * @param evt.unit Unit of the Y-axis.
     * @param evt.colors Color map for each mission data property.
     * @param evt.offscreenCanvas Canvas for rendering the line chart.
     * @private
     */
    private async _start({ dpr, port, unit, colors, offscreenCanvas }: StartEvent): Promise<void> {
        await LineChart2d._fontFaceSet;

        const ctx = offscreenCanvas?.getContext('2d');
        this._ctx = ctx;
        this._dpr = dpr;
        this._unit = unit;
        this._colors = colors;
        this._offscreenCanvas = offscreenCanvas;

        if (ctx) {
            this._updateScaleAndDimensions();
            port.onmessage = this._onPortMessage.bind(this);
        }
    }
    /**
     * Handles messages received on the port and updates the chart with new data.
     *
     * @param evt Message event containing data for the line chart.
     * @private
     */
    private _onPortMessage(evt: MessageEvent<FromSimulatorToSubscriberEvent>): void {
        Object.entries(evt.data.missionData).forEach(([key, data]) => {
            if (data) {
                const missionDataProperty = key as MissionDataProperty;
                if (!this._storedData[missionDataProperty]) {
                    this._storedData[missionDataProperty] = [];
                }
                this._storedData[missionDataProperty]?.push(...data);
            }
        });

        const {
            _ctx: ctx,
            _unit: unit,
            _colors: colors,
            _storedData: storedData,
            _canvasWidth: canvasWidth,
            _canvasHeight: canvasHeight,
        } = this;

        if (!ctx) return;

        const { minY, maxY, minX, maxX, prettyYInterval } = this._computeMinMaxValues(
            evt.data.missionData,
            canvasHeight
        );

        // Prefer named functions to help with performance profiling.
        this._cancelAndRequestAnimationFrame(function animationFrame() {
            drawChart({
                ctx,
                minX,
                maxX,
                minY,
                maxY,
                prettyYInterval,
                canvasWidth,
                canvasHeight,
                chartUnit: unit,
                chartData: storedData,
                chartColors: colors,
            });
        });
    }
    /**
     * Computes the minimum and maximum X and Y values for the chart.
     *
     * @param batchedData Batched data points.
     * @param canvasHeight Height of the canvas.
     * @returns Object containing minimum and maximum X and Y values, and Y axis interval.
     * @private
     */
    private _computeMinMaxValues(
        batchedData: BatchedData,
        canvasHeight: number
    ): {
        minY: number;
        maxY: number;
        minX: number;
        maxX: number;
        prettyYInterval: number;
    } {
        const flatBatchedDataValues = Object.values(batchedData).flat() as number[];
        /**
         * Storing these values ensures we're only every processing batched data points rather than all the data every time.
         */
        for (let idx = 0; idx < flatBatchedDataValues.length; idx++) {
            const dataValue = flatBatchedDataValues[idx];
            if (idx % 2 === 0) {
                if (dataValue > this._maxX || isNaN(this._maxX)) this._maxX = dataValue;
                if (dataValue < this._minX || isNaN(this._minX)) this._minX = dataValue;
            } else {
                if (dataValue > this._maxY || isNaN(this._maxY)) this._maxY = dataValue;
                if (dataValue < this._minY || isNaN(this._minY)) this._minY = dataValue;
            }
        }

        const { prettyMinY, prettyMaxY, prettyYInterval } = getPrettyMinMaxY(
            this._minY,
            this._maxY,
            canvasHeight
        );

        return {
            minY: prettyMinY,
            maxY: prettyMaxY,
            minX: this._minX,
            maxX: this._maxX,
            prettyYInterval,
        };
    }
    /**
     * Updates the canvas scale based on the device pixel ratio and adjusts canvas dimensions.
     *
     * @private
     */
    private _updateScaleAndDimensions(): void {
        const { _dpr: dpr, _ctx: ctx } = this;
        if (!ctx) return;

        ctx.scale(dpr, dpr);
        this._canvasWidth = ctx.canvas.width / dpr - PADDING_LEFT - PADDING_RIGHT;
        this._canvasHeight = ctx.canvas.height / dpr - PADDING_TOP - PADDING_BOTTOM;
    }
    /**
     * Cancels any pending animation frames and requests a new animation frame.
     *
     * @param draw Function to be called on the next animation frame.
     * @private
     */
    private _cancelAndRequestAnimationFrame(draw: VoidFunction): void {
        if (this._frame) {
            cancelAnimationFrame(this._frame);
        }
        this._frame = requestAnimationFrame(draw);
    }
}
