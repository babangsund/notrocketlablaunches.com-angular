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
    /**
     * Assigned mission. Source of truth for all data.
     *
     * @private
     */
    private _mission: null | Mission = null;
    /**
     * Seconds since mission started.
     *
     * @private
     */
    private _missionTimeSec = 0;
    /**
     * Millisecond timestamp for when the mission was started. Useful for determining current "absolute" mission time in Ms.
     *
     * @private
     */
    private _missionStartTimeMs: number | null = null;
    /**
     * The nodejs interval to be cleared if the mission is paused.
     *
     * @private
     */
    private _missionInterval: Timeout | null = null;
    /**
     * When updateMission is called, startMission is blocked by the promise.
     * This is primarily because updateMission needs to fetch (import) the missionData
     *
     * @private
     */
    private _updateMissionPromise: null | Promise<void> = null;
    /**
     * All interpolated data is persisted in dataLakes as a source of truth for generated data.
     * Existing data is emitted to subscribers from the dataLake when they connect,
     * and newly generated data is then pushed in batches.
     *
     * @private
     */
    private _dataLake: Partial<Record<MissionDataProperty, number[]>> = {};
    /**
     * The subscribers for a given telemetry property.
     * A subscriber will also hold a reference to an entry in this list.
     *
     * @private
     */
    private _subscriberPool: Partial<Record<MissionDataProperty, number[][]>> = {};
    /**
     * Current index of missionData for each telemetry property.
     *
     * @private
     */
    private _checkpointIndexMap: Partial<Record<MissionDataProperty, number>> = {};
    /**
     * All the available data for interpolation.
     *
     * @private
     */
    private _missionData: Partial<MissionData> = {};
    /**
     * New property subscribers are processed every cycle.
     *
     * @private
     */
    private readonly _addSubscriberEventQueue: AddSubscriberEvent[] = [];
    /**
     * Subscriber to one or more properties (telemetry).
     * Interval is responsible for sending to port and then draining batchedData.
     *
     * @private
     */
    private readonly _subscribers = new Map<string, Subscriber>();
    /**
     * A multiplier for the timeStep. Determines how quickly the mission progresses.
     *
     * @private
     */
    private _missionPlaybackSpeed = DEFAULT_MISSION_PLAYBACK_SPEED;
    /**
     * The rate at which mission time moves.
     * 10 is 10x the speed
     *
     * @private
     */
    private _timeStep = 1 / (TELEMETRY_SOURCE_RATE_HZ / this._missionPlaybackSpeed);
    /**
     * Is the mission currently running?
     *
     * @private
     */
    private _isMissionRunning = false;
    /**
     * Did the mission reach the last event?
     *
     * @private
     */
    private _isMissionComplete = false;
    /**
     * Set a mission. Fetches interpolation data.
     * Wraps internal _updateMission to prevent public APIs from being async when it isn't needed.
     *
     * @param missionId Id of the mission.
     */
    public updateMission(missionId: string): void {
        this._updateMissionPromise = this._updateMission(missionId);
    }
    /**
     * Starts mission timer and generates interpolated data between "checkpoints".
     */
    public startMission(): void {
        if (this._isMissionComplete) return; // Noop

        void this._startMission();

        // Restart subscribers
        this._subscribers.forEach((sub) => {
            clearInterval(sub.interval);

            // Only transfer to worker at the desired rate
            sub.interval = this._startDataInterval(sub.port, sub.batchedData, sub.hz);
            this._subscribers.set(sub.id, sub);
        });
    }
    /**
     * Stops (pauses) the current mission.
     */
    public stopMission(): void {
        this._isMissionRunning = false;
        if (this._missionInterval) {
            clearInterval(this._missionInterval);
            this._missionInterval = null;
        }

        this._subscribers.forEach((sub) => {
            clearInterval(sub.interval);
        });
    }
    /**
     * Updates the mission playback speed.
     *
     * @param missionPlaybackSpeed New playback speed
     */
    public updateMissionPlaybackSpeed(missionPlaybackSpeed: number): void {
        this._missionPlaybackSpeed = missionPlaybackSpeed;
        this._timeStep = 1 / (TELEMETRY_SOURCE_RATE_HZ / this._missionPlaybackSpeed);
        void this._startMission();
    }
    /**
     * Subscribes a new port to receive requested data in batches.
     *
     * @param evt `AddSubscriberEvent`
     */
    public addSubscriber(evt: AddSubscriberEvent): void {
        this._addSubscriberEventQueue.push(evt);
    }
    /**
     * Changes the rate at which subscribed ports receive data.
     *
     * @param evt `UpdateSubscriberEvent`
     */
    public updateSubscriber(evt: UpdateSubscriberEvent): void {
        const subscriber = this._subscribers.get(evt.id);
        if (!subscriber) return;

        const batchedData = subscriber.batchedData;
        clearInterval(subscriber.interval);

        this._subscribers.set(subscriber.id, {
            ...subscriber,
            hz: evt.hz,
            interval: this._startDataInterval(subscriber.port, batchedData, evt.hz),
        });
    }
    /**
     * Fetches a mission for the given `_missionId` and prepares the rendering loop values.
     *
     * @param _missionId Id of the mission
     * @private
     */
    private async _updateMission(_missionId: string): Promise<void> {
        const mission = await import(`../../data/missions/${_missionId}.json`);
        const missionData = mission.missionData;

        this._mission = mission;
        this._missionData = missionData;

        await new Promise<void>((resolve) => {
            const dataKeys = Object.keys(missionData);
            const plannedDataKeys: MissionDataProperty[] = [];
            const interpolationDataKeys: MissionDataProperty[] = [];
            for (let idx = 0; idx < dataKeys.length; idx++) {
                const dataKey = dataKeys[idx] as MissionDataProperty;
                if (dataKey.includes('Planned')) plannedDataKeys.push(dataKey);
                else interpolationDataKeys.push(dataKey);
            }

            this._dataLake = dataKeys.reduce((p, c) => ({ ...p, [c]: [] }), {});
            this._subscriberPool = interpolationDataKeys.reduce((p, c) => ({ ...p, [c]: [] }), {});
            this._checkpointIndexMap = interpolationDataKeys.reduce(
                (p, c) => ({ ...p, [c]: 0 }),
                {}
            );

            plannedDataKeys.forEach((key) => {
                // Ignore timestamp from planned data. (i.e. alt, lat, lon)
                this._dataLake[key]?.push(
                    ...missionData[key].map(([, value]: [number, number]) => value)
                );
            });

            resolve();
        });
    }
    /**
     * Starts the mission simulation and updates telemetry data at a set frequency (100hz).
     * If the mission completes, it stops the simulation and posts a mission-complete message.
     *
     * @returns A promise that resolves when the mission starts successfully.
     * @private
     */
    private async _startMission(): Promise<void> {
        if (this._updateMissionPromise) await this._updateMissionPromise;
        if (!this._missionStartTimeMs) this._missionStartTimeMs = Date.now();
        if (this._missionInterval) {
            clearInterval(this._missionInterval);
            this._missionInterval = null;
        }

        const telemetryKeys = Object.keys(this._checkpointIndexMap);

        this._isMissionRunning = true;
        this._missionInterval = setInterval(() => {
            if (
                this._mission?.missionEvents &&
                this._missionTimeSec >
                    this._mission?.missionEvents[this._mission?.missionEvents.length - 1]
                        .timeFromLaunchSec
            ) {
                this._isMissionComplete = true;
                this._isMissionRunning = false;
                this.stopMission();
                postMessage({ type: 'mission-complete' } satisfies MissionCompleteEvent);
                return;
            }

            this._drainAddSubscriberEventQueue();
            if (!this._isMissionRunning && this._missionInterval)
                clearInterval(this._missionInterval);

            this._missionTimeSec += this._timeStep;

            const currentMissionTimeMs =
                (this._missionStartTimeMs ?? 0) + this._missionTimeSec * 1000;
            const now = new Date(currentMissionTimeMs).valueOf();
            const interpolateTelemetry = this._makeTelemetryInterpolation(now);
            for (let idx = 0; idx < telemetryKeys.length; idx++) {
                const property = telemetryKeys[idx] as MissionDataProperty;
                interpolateTelemetry(property);
            }

            // i.e. Rocket is producing data at a 100hz rate
        }, 1000 / TELEMETRY_SOURCE_RATE_HZ);
    }
    /**
     * Handles the addition of a new subscriber for mission data.
     *
     * Upon receiving an event (`AddSubscriberEvent`), the method sends initial (e.g. any existing) mission data to the subscriber.
     * It then creates a new data interval for the subscriber based on the specified frequency (hz).
     * The subscriber is added to the pool of active subscribers for periodic updates.
     *
     * @private
     * @param evt - The event object containing details about the subscriber and requested mission data.
     */
    private _addSubscriber({ id, hz, port, missionDataProperties }: AddSubscriberEvent): void {
        // Send the existing produced data to this consumer.
        if (this._mission) {
            port.postMessage({
                type: 'initial-data',
                missionTimeSec: this._missionTimeSec,
                missionId: this._mission.missionId,
                missionSummary: this._mission.missionSummary,
                missionStages: this._mission.missionStages,
                missionEvents: this._mission.missionEvents,
                missionData: missionDataProperties.reduce<BatchedData>((p, c) => {
                    p[c] = this._dataLake[c] ?? [];
                    return p;
                }, {}),
            } satisfies InitialDataEvent);
        }

        const batchedData: BatchedData = missionDataProperties.reduce(
            (p, c) => ({ ...p, [c]: [] }),
            {}
        );

        // Add a subscriber for each property of this chart
        missionDataProperties.forEach((property) => {
            const data = batchedData[property];
            if (data) {
                this._subscriberPool[property]?.push(data);
            }
        });

        this._subscribers.set(id, {
            id,
            hz,
            port,
            batchedData,
            missionDataProperties,
            interval: this._startDataInterval(port, batchedData, hz),
        });
    }
    /**
     * Processes the queue of pending `AddSubscriberEvent` requests.
     * For each event in the queue, the method delegates the task of adding the subscriber to the `_addSubscriber` method.
     *
     * @private
     */
    private _drainAddSubscriberEventQueue(): void {
        while (this._addSubscriberEventQueue.length) {
            const addSubscriberEvent = this._addSubscriberEventQueue.pop();
            if (addSubscriberEvent) {
                this._addSubscriber(addSubscriberEvent);
            }
        }
    }
    /**
     * Sends batched data to the port at given frequency (hz).
     *
     * @param port Message port for communication.
     * @param batchedData List to drain of data at the given hz.
     * @param hz Rate for posting data to the subscriber.
     * @returns The interval.
     * @private
     */
    private _startDataInterval(port: MessagePort, batchedData: BatchedData, hz: number): Timeout {
        const intervalMs = 1000 / hz;
        const interval = setInterval(() => {
            port.postMessage({
                type: 'batched-data',
                missionData: batchedData,
                missionTimeSec: this._missionTimeSec,
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
     * @private
     */
    private _makeTelemetryInterpolation(nowMs: number): (property: MissionDataProperty) => void {
        const interpolateProperty = (property: MissionDataProperty): void => {
            const propertyCheckpoints = this._missionData[property];
            if (!propertyCheckpoints) {
                return;
            }

            const checkpointIndex = this._checkpointIndexMap[property];
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
            if (this._missionTimeSec >= x1) {
                // Update the checkpoint index to the next pair of data points
                this._checkpointIndexMap[property] = checkpointIndex + 1;
                return;
            }

            if (checkpointIndex < propertyCheckpoints.length - 1) {
                const interpolatedValue = linearInterpolation(x0, y0, x1, y1, this._missionTimeSec);
                this._dataLake[property]?.push(nowMs, interpolatedValue);
                this._subscriberPool[property]?.forEach((s) => s.push(nowMs, interpolatedValue));
            }
        };
        return interpolateProperty;
    }
}
