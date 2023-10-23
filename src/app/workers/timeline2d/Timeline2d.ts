import { THEME_COLOR } from 'src/app/constants';
import { MissionDataProperty, MissionEvents } from 'src/app/data/data.model';
import { loadFontFaceSet } from 'src/app/utils/loadFontFaceSet';
import {
    FromSimulatorToSubscriberEvent,
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
    /**
     * Loads the font face set.
     * The promise is used to block rendering until fonts are ready.
     * @private
     */
    private static readonly _fontFaceSet = loadFontFaceSet(self.fonts, ['colfax', 'blenderpro']);
    /**
     * FPS of the environment. Used for animating over time (tweening).
     * @private
     */
    private _fps = 0;
    /**
     * Time since the mission started in seconds.
     * @private
     */
    private _missionTimeSec = 0;
    /**
     * Canvas for rendering the timeline.
     * @private
     */
    private _offscreenCanvas: OffscreenCanvas | null = null;
    /**
     * All the data that has been collected from the simulator.
     * @private
     */
    private _storedData: BatchedData = {};
    /**
     * Current animation frame
     * @private
     */
    private _frame: number | null = null;
    /**
     * Device pixel ratio
     * @private
     */
    private _dpr = 1;
    /**
     * Actual canvas width (divided by dpr)
     * @private
     */
    private _canvasWidth = 0;
    /**
     * Actual canvas height (divided by dpr)
     * @private
     */
    private _canvasHeight = 0;
    /**
     * Canvas rendering context.
     * @private
     */
    private _ctx: OffscreenCanvasRenderingContext2D | null = null;
    /**
     * Index of the mission segment we're currently comparing against for the timeline.
     * @private
     */
    private _currentMissionSegmentIndex = 0;
    /**
     * The desired translation value during a transition from one mission segment to another.
     * @private
     */
    private _targetTranslation = 0;
    /**
     * Translation value during a transition from one mission segment to another.
     * @private
     */
    private _currentTranslation = 0;
    /**
     * Array of segmented mission events based on a set threshold.
     * @private
     */
    private _missionEventSegments: MissionEventsSegment[] = [];
    /**
     * Updates the FPS (Frames Per Second) value.
     * @param fps The new FPS value.
     * @private
     */
    public updateFps = (fps: number): void => {
        this._fps = fps;
    };
    /**
     * Initiates the timeline visualization.
     * @param evt Event containing required parameters to start the timeline.
     * @private
     */
    public start(evt: StartEvent): void {
        void this._start(evt);
    }
    /**
     * Handles resizing of the timeline.
     * @param evt The event object.
     * @param evt.width New width of the canvas.
     * @param evt.height New height of the canvas.
     * @private
     */
    public resize({ width, height }: ResizeEvent): void {
        if (this._offscreenCanvas) {
            this._offscreenCanvas.width = width;
            this._offscreenCanvas.height = height;
            const ctx = this._offscreenCanvas?.getContext('2d');
            if (!ctx) return;
            this._updateScaleAndDimensions();
        }
    }
    /**
     * Internal method to start the timeline visualization.
     * @param evt The event object.
     * @param evt.dpr Device pixel ratio.
     * @param evt.port Message port for communication.
     * @param evt.offscreenCanvas Canvas for rendering the timeline.
     * @private
     */
    private async _start({ dpr, port, offscreenCanvas }: StartEvent): Promise<void> {
        await Timeline2d._fontFaceSet;

        const ctx = offscreenCanvas?.getContext('2d');
        this._ctx = ctx;
        this._dpr = dpr;
        this._offscreenCanvas = offscreenCanvas;

        if (!ctx) return;

        this._updateScaleAndDimensions();
        port.onmessage = this._onPortMessage.bind(this);
    }
    /**
     * Updates the canvas scale and its dimensions.
     * @private
     */
    private _updateScaleAndDimensions(): void {
        const ctx = this._ctx;
        if (!ctx) return;

        ctx.scale(this._dpr, this._dpr);
        this._canvasWidth = ctx.canvas.width / this._dpr;
        this._canvasHeight = ctx.canvas.height / this._dpr;
    }
    /**
     * Handles messages received on the port.
     * @param evt Message event containing data from the simulator.
     * @private
     */
    private _onPortMessage(evt: MessageEvent<FromSimulatorToSubscriberEvent>): void {
        if (isInitialDataEvent(evt)) {
            this._missionEventSegments = this._getMissionEventSegments(evt.data.missionEvents);
        }

        this._missionTimeSec = evt.data.missionTimeSec;

        // Update stored data with new data batch
        Object.entries(evt.data.missionData).forEach(([key, data]) => {
            if (data) {
                const missionDataProperty = key as MissionDataProperty;
                if (!this._storedData[missionDataProperty]) {
                    this._storedData[missionDataProperty] = [];
                }
                this._storedData[missionDataProperty]?.push(...data);
            }
        });

        // Find the current segment we're in.
        const currentSegmentIndex = this._missionEventSegments.findIndex(
            (x) => x.endTimeSec > this._missionTimeSec
        );
        // If it's a different one than we have stored, we're in a new segment.
        // Update the value and start a transition.
        if (
            currentSegmentIndex !== -1 &&
            currentSegmentIndex !== this._currentMissionSegmentIndex
        ) {
            this._currentMissionSegmentIndex = currentSegmentIndex;
            this._targetTranslation = this._canvasHeight - TIMER_HEIGHT - LABEL_HEIGHT;
            this._cancelAndRequestAnimationFrame(this._transitionTimeline);
            return;
        }

        // Not done transitioning
        if (this._currentTranslation !== this._targetTranslation) {
            return;
        }

        this._cancelAndRequestAnimationFrame(this._drawTimeline);
    }
    /**
     * Cancels any pending animation frames and requests a new animation frame.
     * @param draw The function to be called on the next animation frame.
     * @private
     */
    private _cancelAndRequestAnimationFrame(draw: VoidFunction): void {
        if (this._frame) {
            cancelAnimationFrame(this._frame);
        }
        this._frame = requestAnimationFrame(draw);
    }
    /**
     * Transitions the timeline visualization.
     * @private
     */
    private readonly _transitionTimeline = (): void => {
        if (this._currentTranslation !== this._targetTranslation) {
            const ctx = this._ctx;
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
    /**
     * Renders the timeline on the canvas.
     * @private
     */
    private readonly _drawTimeline = (): void => {
        const ctx = this._ctx;
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
                        // Calculate from when the segment started.
                        (missionEventsSegment.endTimeSec - missionEventsSegment.startTimeSec)
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
        drawMissionEventsSegment(this._missionEventSegments[0], 0);

        // Move canvas for segment (stacked on top)
        ctx.translate(0, -(canvasHeight - TIMER_HEIGHT));
        drawMissionEventsSegment(this._missionEventSegments[1], 1);

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
    /**
     * Segments mission events based on a set threshold.
     * @param missionEvents Array of mission events.
     * @returns Array of segmented mission events.
     * @private
     */
    private _getMissionEventSegments(missionEvents: MissionEvents): MissionEventsSegment[] {
        const thresholdSec = 500;
        const segments: MissionEventsSegment[] = [];
        let currentSegment = [];

        for (let i = 0; i < missionEvents.length - 1; i++) {
            const currentEvent = missionEvents[i];
            const nextEvent = missionEvents[i + 1];

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
        currentSegment.push(missionEvents[missionEvents.length - 1]);
        segments.push({
            startTimeSec: segments[segments.length - 1]?.endTimeSec ?? 0,
            missionEvents: currentSegment,
            endTimeSec: currentSegment[currentSegment.length - 1].timeFromLaunchSec,
        });

        return segments;
    }
    /**
     * Formats the provided duration in seconds to HH:MM:SS format.
     * @param sec Duration in seconds.
     * @returns Formatted duration.
     * @private
     */
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
