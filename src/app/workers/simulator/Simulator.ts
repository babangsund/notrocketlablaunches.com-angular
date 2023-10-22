import { Mission, MissionData, MissionDataProperty } from 'src/app/data/data.model';
import { linearInterpolation } from 'src/app/utils/linearInterpolation';
import { DEFAULT_MISSION_PLAYBACK_SPEED, TELEMETRY_SOURCE_RATE_HZ } from '../../constants';
import { BatchedData } from '../worker.model';
import {
    BatchedDataEvent,
    InitialDataEvent,
    MissionCompleteEvent,
    type AddSubscriberEvent,
    type Subscriber,
    type UpdateSubscriberEvent,
} from './simulator.worker.model';

type Timeout = ReturnType<typeof setInterval>;

export class Simulator {
    private mission: null | Mission = null;
    /**
     * Seconds since mission started.
     */
    private missionTimeSec = 0;
    /**
     * Millisecond timestamp for when the mission was started. Useful for determining current "absolute" mission time in Ms.
     */
    private missionStartTimeMs: number | null = null;
    /**
     * The nodejs interval to be cleared if the mission is paused.
     */
    private missionInterval: Timeout | null = null;
    /**
     * When updateMission is called, startMission is blocked by the promise.
     * This is primarily because updateMission needs to fetch (import) the missionData
     */
    private updateMissionPromise: null | Promise<void> = null;
    /**
     * All interpolated data is persisted in dataLakes as a source of truth.
     * Existing data is emitted to subscribers from the dataLake when they connect,
     * and newly generated data is then pushed in batches.
     */
    private dataLake: Partial<Record<MissionDataProperty, number[]>> = {};
    /**
     * The subscribers for a given telemetry property.
     * A subscriber will also hold a reference to an entry in this list.
     */
    private subscriberPool: Partial<Record<MissionDataProperty, number[][]>> = {};
    /**
     * Current index of missionData for each telemetry property.
     */
    private checkpointIndexMap: Partial<Record<MissionDataProperty, number>> = {};
    /**
     * All the available data for interpolation.
     */
    private missionData: Partial<MissionData> = {};
    /**
     * New property subscribers are processed every cycle.
     */
    private readonly addSubscriberEventQueue: AddSubscriberEvent[] = [];
    /**
     * Subscriber to one or more properties (telemetry).
     * Interval is responsible for sending to port and then draining batchedData.
     */
    private readonly subscribers = new Map<string, Subscriber>();
    /**
     * A multiplier for the timeStep. Determines how quickly the mission progresses.
     */
    private missionPlaybackSpeed = DEFAULT_MISSION_PLAYBACK_SPEED;
    /**
     * The rate at which mission time moves.
     * /10 is 10x the speed
     */
    private timeStep = 1 / (TELEMETRY_SOURCE_RATE_HZ / this.missionPlaybackSpeed);
    /**
     * Is the mission currently running?
     */
    isMissionRunning = false;
    /**
     * Did the mission reach the last event?
     */
    isMissionComplete = false;

    /**
     * Set a mission. Fetches interpolation data.
     * Wraps internal _updateMission to prevent public APIs from being async when it isn't needed.
     */
    public updateMission(missionId: string): void {
        this.updateMissionPromise = this._updateMission(missionId);
    }

    /**
     * Starts mission timer and generates interpolated data between "checkpoints".
     */
    public startMission(): void {
        if (this.isMissionComplete) return; // Noop

        void this._startMission();

        // Restart subscribers
        this.subscribers.forEach((sub) => {
            clearInterval(sub.interval);

            // Only transfer to worker at the desired rate
            sub.interval = this.startDataInterval(sub.port, sub.batchedData, sub.hz);
            this.subscribers.set(sub.id, sub);
        });
    }

    public stopMission(): void {
        this.isMissionRunning = false;
        if (this.missionInterval) clearInterval(this.missionInterval);

        this.subscribers.forEach((sub) => {
            clearInterval(sub.interval);
        });
    }

    public updateMissionPlaybackSpeed(missionPlaybackSpeed: number): void {
        this.missionPlaybackSpeed = missionPlaybackSpeed;
        this.timeStep = 1 / (TELEMETRY_SOURCE_RATE_HZ / this.missionPlaybackSpeed);
        void this._startMission();
    }

    /**
     * Subscribes a new port to receive requested data in batches.
     */
    public addSubscriber(evt: AddSubscriberEvent): void {
        this.addSubscriberEventQueue.push(evt);
    }

    /**
     * Changes the rate at which subscribed ports receive data.
     */
    public updateSubscriber(evt: UpdateSubscriberEvent): void {
        const subscriber = this.subscribers.get(evt.id);
        if (!subscriber) return;

        const batchedData = subscriber.batchedData;
        clearInterval(subscriber.interval);

        // Only transfer to worker at the desired rate
        subscriber.interval = this.startDataInterval(subscriber.port, batchedData, evt.hz);
        this.subscribers.set(subscriber.id, subscriber);
    }

    private async _updateMission(_missionId: string): Promise<void> {
        const mission = await import(`../../data/missions/${_missionId}.json`);
        const missionData = mission.missionData;

        this.mission = mission;
        this.missionData = missionData;

        await new Promise<void>((resolve) => {
            const dataKeys = Object.keys(missionData);
            const plannedDataKeys: MissionDataProperty[] = [];
            const interpolationDataKeys: MissionDataProperty[] = [];
            for (let idx = 0; idx < dataKeys.length; idx++) {
                const dataKey = dataKeys[idx] as MissionDataProperty;
                if (dataKey.includes('Planned')) plannedDataKeys.push(dataKey);
                else interpolationDataKeys.push(dataKey);
            }

            this.dataLake = dataKeys.reduce((p, c) => ({ ...p, [c]: [] }), {});
            this.subscriberPool = interpolationDataKeys.reduce((p, c) => ({ ...p, [c]: [] }), {});
            this.checkpointIndexMap = interpolationDataKeys.reduce(
                (p, c) => ({ ...p, [c]: 0 }),
                {}
            );

            plannedDataKeys.forEach((key) => {
                // Ignore timestamp from planned data. (i.e. alt, lat, lon)
                this.dataLake[key]?.push(
                    ...missionData[key].map(([, value]: [number, number]) => value)
                );
            });

            resolve();
        });
    }

    private async _startMission(): Promise<void> {
        if (this.updateMissionPromise) await this.updateMissionPromise;
        if (this.missionInterval) clearInterval(this.missionInterval);
        if (!this.missionStartTimeMs) this.missionStartTimeMs = Date.now();

        const telemetryKeys = Object.keys(this.checkpointIndexMap);

        this.isMissionRunning = true;
        this.missionInterval = setInterval(() => {
            if (
                this.mission?.missionEvents &&
                this.missionTimeSec >
                    this.mission?.missionEvents[this.mission?.missionEvents.length - 1]
                        .timeFromLaunchSec
            ) {
                this.isMissionComplete = true;
                this.isMissionRunning = false;
                this.stopMission();
                postMessage({ type: 'mission-complete' } satisfies MissionCompleteEvent);
                return;
            }

            this.drainAddSubscriberEventQueue();
            if (!this.isMissionRunning && this.missionInterval) clearInterval(this.missionInterval);

            this.missionTimeSec += this.timeStep;

            const currentMissionTimeMs =
                (this.missionStartTimeMs ?? 0) + this.missionTimeSec * 1000;
            const now = new Date(currentMissionTimeMs).valueOf();
            const interpolateTelemetry = this.makeTelemetryInterpolation(now);
            for (let idx = 0; idx < telemetryKeys.length; idx++) {
                const property = telemetryKeys[idx] as MissionDataProperty;
                interpolateTelemetry(property);
            }

            // i.e. Rocket is producing data at a 100hz rate
        }, 1000 / TELEMETRY_SOURCE_RATE_HZ);
    }

    private _addSubscriber(evt: AddSubscriberEvent): void {
        // Send the existing produced data to this consumer.
        if (this.mission) {
            evt.port.postMessage({
                type: 'initial-data',
                missionTimeSec: this.missionTimeSec,
                missionId: this.mission.missionId,
                missionSummary: this.mission.missionSummary,
                missionStages: this.mission.missionStages,
                missionEvents: this.mission.missionEvents,
                initialData: evt.properties.reduce<BatchedData>((p, c) => {
                    p[c] = this.dataLake[c] ?? [];
                    return p;
                }, {}),
            } satisfies InitialDataEvent);
        }

        const batchedData: BatchedData = evt.properties.reduce((p, c) => ({ ...p, [c]: [] }), {});

        // Add a subscriber for each property of this chart
        evt.properties.forEach((property) => {
            const data = batchedData[property];
            if (data) {
                this.subscriberPool[property]?.push(data);
            }
        });

        const subscriber = {
            id: evt.id,
            batchedData,
            hz: evt.hz,
            port: evt.port,
            properties: evt.properties,
            interval: this.startDataInterval(evt.port, batchedData, evt.hz),
        };
        this.subscribers.set(evt.id, subscriber);
    }

    private drainAddSubscriberEventQueue(): void {
        while (this.addSubscriberEventQueue.length) {
            const addSubscriberEvent = this.addSubscriberEventQueue.pop();
            if (addSubscriberEvent) {
                this._addSubscriber(addSubscriberEvent);
            }
        }
    }

    private startDataInterval(port: MessagePort, batchedData: BatchedData, hz: number): Timeout {
        const intervalMs = 1000 / hz;
        const interval = setInterval(() => {
            port.postMessage({
                type: 'batched-data',
                batchedData,
                missionTimeSec: this.missionTimeSec,
            } satisfies BatchedDataEvent);
            Object.values(batchedData).forEach((data) => {
                if (data) {
                    data.length = 0;
                }
            });
        }, intervalMs);

        return interval;
    }

    /**
     * Interpolates a property against its current checkpoint.
     * Pushes produced data to all subscribers of the given property, and to the dataLake, which holds all values ever generated.
     *
     * @param nowMs Current time in milliseconds
     * @returns void
     */
    private makeTelemetryInterpolation(nowMs: number): (property: MissionDataProperty) => void {
        const interpolateProperty = (property: MissionDataProperty): void => {
            const propertyCheckpoints = this.missionData[property];
            if (!propertyCheckpoints) {
                return;
            }

            const checkpointIndex = this.checkpointIndexMap[property];
            if (checkpointIndex === undefined) {
                return;
            }

            // Get the current and next data points
            const [x0, y0] = propertyCheckpoints[checkpointIndex] ?? [];
            const [x1, y1] = propertyCheckpoints[checkpointIndex + 1] ?? [];

            // If there's no next data point
            if (!propertyCheckpoints[checkpointIndex + 1]) {
                return;
            }

            // Check if the current time has passed the next data point
            if (this.missionTimeSec >= x1) {
                // Update the checkpoint index to the next pair of data points
                this.checkpointIndexMap[property] = checkpointIndex + 1;
                return;
            }

            if (checkpointIndex < propertyCheckpoints.length - 1) {
                const interpolatedValue = linearInterpolation(x0, y0, x1, y1, this.missionTimeSec);
                this.dataLake[property]?.push(nowMs, interpolatedValue);
                this.subscriberPool[property]?.forEach((s) => s.push(nowMs, interpolatedValue));
            }
        };
        return interpolateProperty;
    }
}
