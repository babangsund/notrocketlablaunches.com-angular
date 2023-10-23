import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { MissionDataProperty, MissionSummary } from 'src/app/data/data.model';
import { PerfStatsService } from 'src/app/services/perf-stats/perf-stats.service';

import { DEFAULT_MISSION_PLAYBACK_SPEED, DEFAULT_MISSION_SUMMARY } from 'src/app/constants';
import { isFpsEvent } from 'src/app/utils/startReportingWorkerFps';
import {
    AddSubscriberEvent,
    FromSimulatorWorkerEvent,
    StartMissionEvent,
    StopMissionEvent,
    UpdateMissionEvent,
    UpdateMissionPlaybackSpeedEvent,
    UpdateSubscriberEvent,
} from 'src/app/workers/simulator/simulator.worker.model';
import { WorkerId } from '../perf-stats/perf-stats.service.model';

@Injectable({
    providedIn: 'root',
})
/**
 * Service responsible for managing and interacting with the simulation worker.
 * Handles mission summaries, playback speeds, subscriber updates, and more.
 *
 * @example
 * const simulatorService = new SimulatorService(perfStatsServiceInstance);
 * simulatorService.toggleMissionRunning();
 *
 * @see {@link PerfStatsService} for performance statistics tracking.
 */
export class SimulatorService {
    public constructor(private readonly _perfStatsService: PerfStatsService) {
        this._worker = new Worker(
            new URL('../../workers/simulator/simulator.worker', import.meta.url),
            { type: 'module' }
        );
        this._perfStatsService.addWorker();

        this._worker.addEventListener('message', (evt: MessageEvent<FromSimulatorWorkerEvent>) => {
            switch (evt.data.type) {
                case 'fps': {
                    this._perfStatsService.updateWorkerFps(SimulatorService.id, evt.data.fps);
                    break;
                }
                case 'mission-complete': {
                    this._missionIsRunning.next(false);
                    this._missionIsCompleted.next(true);
                    break;
                }
            }
        });

        this.updateMissionSummary(DEFAULT_MISSION_SUMMARY);
    }

    public static id = 'Simulator';

    private readonly _worker: Worker;

    private readonly _missionSummary = new BehaviorSubject<MissionSummary | null>(
        DEFAULT_MISSION_SUMMARY
    );

    private readonly _missionIsRunning = new BehaviorSubject(false);

    private readonly _missionIsCompleted = new BehaviorSubject(false);

    private readonly _missionPlaybackSpeed = new BehaviorSubject(DEFAULT_MISSION_PLAYBACK_SPEED);
    /**
     * Current mission ID.
     */
    public readonly missionId$ = this._missionSummary.pipe(map((ms) => ms?.missionId ?? null));
    /**
     * Current mission summary.
     */
    public get missionSummary$(): Observable<MissionSummary | null> {
        return this._missionSummary.asObservable();
    }
    /**
     * Indicates if the mission is currently running.
     */
    public get missionIsRunning$(): Observable<boolean> {
        return this._missionIsRunning.asObservable();
    }
    /**
     * Indicates if the mission is completed.
     */
    public get missionIsCompleted$(): Observable<boolean> {
        return this._missionIsCompleted.asObservable();
    }
    /**
     * Current mission playback speed.
     */
    public get missionPlaybackSpeed$(): Observable<number> {
        return this._missionPlaybackSpeed.asObservable();
    }
    /**
     * Updates the mission completion status.
     *
     * @param missionIsCompleted Whether the mission is completed.
     */
    public updateMissionIsCompleted(missionIsCompleted: boolean): void {
        this._missionIsCompleted.next(missionIsCompleted);
    }
    /**
     * Toggles the running status of the mission.
     */
    public toggleMissionRunning(): void {
        const missionIsRunning = !this._missionIsRunning.getValue();
        this._missionIsRunning.next(missionIsRunning);
        if (missionIsRunning) {
            this._worker.postMessage({
                type: 'start-mission',
            } satisfies StartMissionEvent);
        } else {
            this._worker.postMessage({
                type: 'stop-mission',
            } satisfies StopMissionEvent);
        }
    }
    /**
     * Updates the mission summary with the given data.
     *
     * @param missionSummary The new mission summary to be set.
     */
    public updateMissionSummary(missionSummary: MissionSummary): void {
        this._missionSummary.next(missionSummary);
        this._worker.postMessage({
            type: 'update-mission',
            missionId: missionSummary.missionId,
        } satisfies UpdateMissionEvent);
    }
    /**
     * Updates the playback speed of the mission.
     *
     * @param missionPlaybackSpeed The new playback speed value.
     */
    public updateMissionPlaybackSpeed(missionPlaybackSpeed: number): void {
        this._missionPlaybackSpeed.next(missionPlaybackSpeed);
        this._worker.postMessage({
            type: 'update-mission-playback-speed',
            missionPlaybackSpeed,
        } satisfies UpdateMissionPlaybackSpeedEvent);
    }
    /**
     * Updates the subscriber with the given worker ID and hz.
     *
     * @param workerId The ID of the worker to be updated.
     * @param hz The new hz value for the subscriber.
     */
    public updateSubscriber(workerId: WorkerId, hz: number): void {
        this._worker.postMessage({
            type: 'update-subscriber',
            id: workerId,
            hz,
        } satisfies UpdateSubscriberEvent);
    }
    /**
     * Adds a new subscriber to the simulator.
     *
     * @param evt The subscriber object
     * @param evt.hz The hz value for the subscriber
     * @param evt.unit The unit of measure for the subscriber
     * @param evt.worker The worker associated with the subscriber
     * @param evt.workerId A unique ID for the subscriber
     * @param evt.canvas The canvas element associated with the subscriber
     * @param evt.missionDataProperties The mission data properties
     * @param evt.colors The colors associated with the mission data properties
     */
    public addSubscriber({
        hz,
        unit,
        canvas,
        worker,
        workerId,
        colors = {},
        missionDataProperties = [],
    }: {
        hz: number;
        unit?: string;
        worker: Worker;
        workerId: WorkerId;
        canvas: HTMLCanvasElement;
        missionDataProperties?: MissionDataProperty[];
        colors?: Record<MissionDataProperty, string>;
    }): void {
        this._perfStatsService.addWorker();

        const channel = new MessageChannel();
        const offscreenCanvas = canvas.transferControlToOffscreen();

        // Pass port and canvas to offscreencanvas worker
        worker.postMessage(
            {
                type: 'start',
                unit,
                colors,
                offscreenCanvas,
                port: channel.port2,
                dpr: window.devicePixelRatio,
            },
            [channel.port2, offscreenCanvas]
        );

        worker.addEventListener('message', (evt) => {
            if (isFpsEvent(evt)) {
                this._perfStatsService.updateWorkerFps(workerId, evt.data.fps);
            }
        });

        // Pass port to simulator
        this._worker.postMessage(
            {
                type: 'add-subscriber',
                hz,
                id: workerId,
                port: channel.port1,
                missionDataProperties,
            } satisfies AddSubscriberEvent,
            [channel.port1]
        );
    }
}
