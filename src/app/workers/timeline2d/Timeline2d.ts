import { THEME_COLOR } from 'src/app/constants';
import { MissionDataProperty, MissionEvents } from 'src/app/data/data.model';
import { loadFontFaceSet } from 'src/app/utils/loadFontFaceSet';
import {
    FromSimulatorToSubscriberEvent,
    isBatchedDataEvent,
    isInitialDataEvent,
} from '../simulator/simulator.worker.model';
import { BatchedData } from '../worker.model';
import { LABEL_HEIGHT, TIMER_HEIGHT, TRANSITION_DURATION_SEC } from './constants';
import { ResizeEvent, StartEvent } from './timeline2d.worker.model';

interface MissionEventsSegment {
    startTimeSec: number;
    endTimeSec: number;
    missionEvents: MissionEvents;
}

export class Timeline2d {
    private static readonly _fontFaceSet = loadFontFaceSet(self.fonts, ['colfax', 'blenderpro']);
    /**
     * FPS of the environment. Used for animating over time.
     */
    private _fps = 0;
    /**
     * Time since the mission started in seconds.
     */
    private _missionTimeSec = 0;
    /**
     * Events from the mission (i.e. MECO-1)
     */
    private _missionEvents: MissionEvents = [];
    /**
     * The offscreen canvas.
     */
    private _offscreenCanvas: OffscreenCanvas | null = null;
    /**
     * All the data that has been collected from the simulator.
     */
    private _storedData: BatchedData = {};
    /**
     * Current animation frame
     */
    private _frame: number | null = null;
    /**
     * Device pixel ratio
     */
    private _dpr = 1;
    /**
     * Actual canvas width (divided by dpr)
     */
    private _canvasWidth = 0;
    /**
     * Actual canvas height (divided by dpr)
     */
    private _canvasHeight = 0;

    public updateFps = (fps: number): void => {
        this._fps = fps;
    };

    public resize({ width, height }: ResizeEvent): void {
        if (this._offscreenCanvas) {
            this._offscreenCanvas.width = width;
            this._offscreenCanvas.height = height;
            const ctx = this._offscreenCanvas?.getContext('2d');
            if (!ctx) return;
            ctx.scale(2, 2);
            this._canvasWidth = ctx.canvas.width / this._dpr;
            this._canvasHeight = ctx.canvas.height / this._dpr;
        }
    }

    private _currentTranslation = 0;
    private _targetTranslation = 0;

    private _pastIndex = 0;

    public start(evt: StartEvent): void {
        void this._start(evt);
    }

    private async _start({ dpr, port, offscreenCanvas }: StartEvent): Promise<void> {
        await Timeline2d._fontFaceSet;
        this._dpr = dpr;
        this._offscreenCanvas = offscreenCanvas;
        const ctx = offscreenCanvas?.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);

            this._canvasWidth = ctx.canvas.width / this._dpr;
            this._canvasHeight = ctx.canvas.height / this._dpr;

            const onPortMessage = (evt: MessageEvent<FromSimulatorToSubscriberEvent>): void => {
                if (isInitialDataEvent(evt)) this._missionEvents = evt.data.missionEvents;

                this._missionTimeSec = evt.data.missionTimeSec;

                const allData = isInitialDataEvent(evt)
                    ? evt.data.initialData
                    : isBatchedDataEvent(evt)
                    ? evt.data.batchedData
                    : {};

                Object.entries(allData).forEach(([key, data]) => {
                    if (data) {
                        const missionDataProperty = key as MissionDataProperty;
                        if (!this._storedData[missionDataProperty]) {
                            this._storedData[missionDataProperty] = [];
                        }
                        this._storedData[missionDataProperty]?.push(...data);
                    }
                });

                // Update the current segment index.
                const currentSegmentIndex = this._getMissionEventSegments().findIndex(
                    (x) => x.endTimeSec > this._missionTimeSec
                );
                if (currentSegmentIndex !== -1 && currentSegmentIndex !== this._pastIndex) {
                    this._pastIndex = currentSegmentIndex;
                    this._targetTranslation = this._canvasHeight - TIMER_HEIGHT - LABEL_HEIGHT;
                    this._cancelAndRequestAnimationFrame(this._transitionTimeline);
                    return;
                }

                // Not done transitioning
                if (this._currentTranslation !== this._targetTranslation) {
                    return;
                }

                this._cancelAndRequestAnimationFrame(this._drawTimeline);
            };

            port.onmessage = onPortMessage;
        }
    }

    private readonly _cancelAndRequestAnimationFrame = (draw: VoidFunction): void => {
        this._cancelAnimationFrameIfExists();
        this._frame = requestAnimationFrame(draw);
    };

    private readonly _cancelAnimationFrameIfExists = (): void => {
        if (this._frame) {
            cancelAnimationFrame(this._frame);
            this._frame = null;
        }
    };

    private readonly _transitionTimeline = (): void => {
        if (this._currentTranslation !== this._targetTranslation) {
            const ctx = this._offscreenCanvas?.getContext('2d');
            if (!ctx) return;

            const time = 1 / TRANSITION_DURATION_SEC;
            const transitionIncr = this._fps / time;
            this._currentTranslation = Math.min(
                this._targetTranslation,
                this._currentTranslation + this._canvasHeight / transitionIncr
            );

            this._drawTimeline();

            this._cancelAndRequestAnimationFrame(this._transitionTimeline);
        }
    };

    private readonly _drawTimeline = (): void => {
        const ctx = this._offscreenCanvas?.getContext('2d');
        if (!ctx) return;

        const { _canvasWidth: canvasWidth, _canvasHeight: canvasHeight } = this;

        const drawMissionEventsSegment = (
            missionEventsSegment: MissionEventsSegment,
            segmentIndex: number
        ): void => {
            const segmentOffset = segmentIndex === 0 ? 0 : LABEL_HEIGHT;
            const timerHeight = TIMER_HEIGHT + LABEL_HEIGHT;
            const timelineOffset = timerHeight + segmentOffset;
            const timelineHeight = canvasHeight - timerHeight - segmentOffset;

            const lineWidth = 2;
            const lineCenter = canvasWidth / 2 - lineWidth * 2;

            // Draw the total timeline
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.5;
            ctx.fillRect(lineCenter, timelineOffset, lineWidth, timelineHeight);
            ctx.globalAlpha = 1.0;

            // Draw the passed timeline
            const passedTimeInSec = this._missionTimeSec;
            const passedTimeInPercent = Math.max(
                // For future event segments, don't show a line that's e.g. -15% completed.
                0,
                Math.min(
                    // When the mission passes the last event,
                    // don't increase the passed time percentage (as it will exceed total mission time.)
                    1,
                    (passedTimeInSec - missionEventsSegment.startTimeSec) /
                        missionEventsSegment.endTimeSec
                )
            );

            ctx.fillStyle = THEME_COLOR; // Replace 'blue' with your theme color
            const passedLineHeight = timelineHeight * passedTimeInPercent;
            ctx.fillRect(
                lineCenter,
                timelineOffset + timelineHeight - passedLineHeight,
                lineWidth,
                passedLineHeight
            );

            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            // Draw the stages
            ctx.textAlign = 'center';
            ctx.font = '14px Colfax, sans-serif';
            ctx.fillStyle = '#ffffff';
            const ARBITRARY_OFFSET = 3;
            missionEventsSegment.missionEvents.forEach((missionEvent) => {
                const hasBeenPassed = this._missionTimeSec >= missionEvent.timeFromLaunchSec;
                if (!hasBeenPassed) ctx.globalAlpha = 0.5;
                const y =
                    timelineHeight -
                    timelineHeight *
                        (missionEvent.timeFromLaunchSec / missionEventsSegment.endTimeSec);
                ctx.clearRect(
                    lineCenter,
                    timelineOffset + y - LABEL_HEIGHT,
                    lineWidth,
                    LABEL_HEIGHT
                );
                const textCenter = canvasWidth / 2;
                ctx.fillText(missionEvent.title, textCenter, timelineOffset + y - ARBITRARY_OFFSET);
                ctx.globalAlpha = 1.0;
            });
        };

        // Clear the canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Save default view
        ctx.save();
        // Move canvas for transition
        ctx.translate(0, this._currentTranslation);
        drawMissionEventsSegment(this._getMissionEventSegments()[0], 0);

        // Move canvas for segment (stacked on top)
        ctx.translate(0, -(canvasHeight - TIMER_HEIGHT));
        drawMissionEventsSegment(this._getMissionEventSegments()[1], 1);

        // Restore default view
        ctx.restore();

        // Draw the timer
        ctx.clearRect(0, 0, canvasWidth, TIMER_HEIGHT);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px BlenderPro, monospace';
        const timerCenter = canvasWidth / 2;
        ctx.fillText(`T + ${this._formatDuration(this._missionTimeSec)}`, timerCenter, 0);
    };

    private _getMissionEventSegments(): MissionEventsSegment[] {
        const thresholdSec = 500;
        const segments: MissionEventsSegment[] = [];
        let currentSegment = [];

        for (let i = 0; i < this._missionEvents.length - 1; i++) {
            const currentEvent = this._missionEvents[i];
            const nextEvent = this._missionEvents[i + 1];

            currentSegment.push(currentEvent);

            // If the time difference to the next event exceeds the threshold, start a new segment.
            if (nextEvent.timeFromLaunchSec - currentEvent.timeFromLaunchSec > thresholdSec) {
                const startTimeSec = segments[segments.length - 1]?.endTimeSec ?? 0;
                segments.push({
                    startTimeSec,
                    missionEvents: currentSegment,
                    endTimeSec: currentSegment[currentSegment.length - 1].timeFromLaunchSec,
                });
                currentSegment = [];
            }
        }

        // Don't forget to include the last event and segment.
        currentSegment.push(this._missionEvents[this._missionEvents.length - 1]);
        segments.push({
            startTimeSec: segments[segments.length - 1]?.endTimeSec ?? 0,
            missionEvents: currentSegment,
            endTimeSec: currentSegment[currentSegment.length - 1].timeFromLaunchSec,
        });

        return segments;
    }

    private _formatDuration(sec: number): string {
        let totalSeconds = Math.floor(sec);
        const hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
            seconds
        ).padStart(2, '0')}`;
    }
}
