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
    private static fontFaceSet = loadFontFaceSet(self.fonts, ['colfax', 'blenderpro']);
    /**
     * FPS of environment. Used for animating over time.
     */
    private fps = 0;
    /**
     * mission
     */
    private missionTimeSec = 0;
    /**
     *
     */
    private missionEvents: MissionEvents = [];
    /**
     *
     */
    private offscreenCanvas: OffscreenCanvas | null = null;
    /**
     *
     */
    private storedData: BatchedData = {};
    /**
     *
     */
    private frame: number | null = null;
    /**
     *
     */
    private dpr = 1;

    private canvasWidth = 0;
    private canvasHeight = 0;

    public updateFps = (fps: number): void => {
        this.fps = fps;
    };

    public resize({ width, height }: ResizeEvent): void {
        if (this.offscreenCanvas) {
            this.offscreenCanvas.width = width;
            this.offscreenCanvas.height = height;
            const ctx = this.offscreenCanvas?.getContext('2d');
            if (!ctx) return;
            ctx.scale(2, 2);
            this.canvasWidth = ctx.canvas.width / this.dpr;
            this.canvasHeight = ctx.canvas.height / this.dpr;
        }
    }

    private currentTranslation = 0;
    private targetTranslation = 0;

    private pastIndex = 0;

    public start(evt: StartEvent): void {
        void this._start(evt);
    }

    private async _start({ dpr, port, offscreenCanvas }: StartEvent): Promise<void> {
        await Timeline2d.fontFaceSet;
        this.dpr = dpr;
        this.offscreenCanvas = offscreenCanvas;
        const ctx = offscreenCanvas?.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);

            this.canvasWidth = ctx.canvas.width / this.dpr;
            this.canvasHeight = ctx.canvas.height / this.dpr;

            const onPortMessage = (evt: MessageEvent<FromSimulatorToSubscriberEvent>): void => {
                if (isInitialDataEvent(evt)) this.missionEvents = evt.data.missionEvents;

                this.missionTimeSec = evt.data.missionTimeSec;

                const allData = isInitialDataEvent(evt)
                    ? evt.data.initialData
                    : isBatchedDataEvent(evt)
                    ? evt.data.batchedData
                    : {};

                Object.entries(allData).forEach(([key, data]) => {
                    if (data) {
                        const missionDataProperty = key as MissionDataProperty;
                        if (!this.storedData[missionDataProperty]) {
                            this.storedData[missionDataProperty] = [];
                        }
                        this.storedData[missionDataProperty]?.push(...data);
                    }
                });

                // Update the current segment index.
                const currentSegmentIndex = this.getMissionEventSegments().findIndex(
                    (x) => x.endTimeSec > this.missionTimeSec
                );
                if (currentSegmentIndex !== -1 && currentSegmentIndex !== this.pastIndex) {
                    this.pastIndex = currentSegmentIndex;
                    this.targetTranslation = this.canvasHeight - TIMER_HEIGHT - LABEL_HEIGHT;
                    this.cancelAndRequestAnimationFrame(this.transitionTimeline);
                    return;
                }

                // Not done transitioning
                if (this.currentTranslation !== this.targetTranslation) {
                    return;
                }

                this.cancelAndRequestAnimationFrame(this.drawTimeline);
            };

            port.onmessage = onPortMessage;
        }
    }

    private readonly cancelAndRequestAnimationFrame = (draw: VoidFunction): void => {
        this._cancelAnimationFrameIfExists();
        this.frame = requestAnimationFrame(draw);
    };

    private readonly _cancelAnimationFrameIfExists = (): void => {
        if (this.frame) {
            cancelAnimationFrame(this.frame);
            this.frame = null;
        }
    };

    private readonly transitionTimeline = (): void => {
        if (this.currentTranslation !== this.targetTranslation) {
            const ctx = this.offscreenCanvas?.getContext('2d');
            if (!ctx) return;

            const time = 1 / TRANSITION_DURATION_SEC;
            const transitionIncr = this.fps / time;
            this.currentTranslation = Math.min(
                this.targetTranslation,
                this.currentTranslation + this.canvasHeight / transitionIncr
            );

            this.drawTimeline();

            this.cancelAndRequestAnimationFrame(this.transitionTimeline);
        }
    };

    private readonly drawTimeline = (): void => {
        const ctx = this.offscreenCanvas?.getContext('2d');
        if (!ctx) return;

        const { canvasWidth, canvasHeight } = this;

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
            const passedTimeInSec = this.missionTimeSec;
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
                const hasBeenPassed = this.missionTimeSec >= missionEvent.timeFromLaunchSec;
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
        ctx.translate(0, this.currentTranslation);
        drawMissionEventsSegment(this.getMissionEventSegments()[0], 0);

        // Move canvas for segment (stacked on top)
        ctx.translate(0, -(canvasHeight - TIMER_HEIGHT));
        drawMissionEventsSegment(this.getMissionEventSegments()[1], 1);

        // Restore default view
        ctx.restore();

        // Draw the timer
        ctx.clearRect(0, 0, canvasWidth, TIMER_HEIGHT);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px BlenderPro, monospace';
        const timerCenter = canvasWidth / 2;
        ctx.fillText(`T + ${this.formatDuration(this.missionTimeSec)}`, timerCenter, 0);
    };

    private getMissionEventSegments(): MissionEventsSegment[] {
        const thresholdSec = 500;
        const segments: MissionEventsSegment[] = [];
        let currentSegment = [];

        for (let i = 0; i < this.missionEvents.length - 1; i++) {
            const currentEvent = this.missionEvents[i];
            const nextEvent = this.missionEvents[i + 1];

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
        currentSegment.push(this.missionEvents[this.missionEvents.length - 1]);
        segments.push({
            startTimeSec: segments[segments.length - 1]?.endTimeSec ?? 0,
            missionEvents: currentSegment,
            endTimeSec: currentSegment[currentSegment.length - 1].timeFromLaunchSec,
        });

        return segments;
    }

    private formatDuration(sec: number): string {
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
