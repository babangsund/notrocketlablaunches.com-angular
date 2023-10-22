import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { MissionDataProperty, MissionSummary } from 'src/app/data/data.model';
import { PerfStatsService } from 'src/app/services/perf-stats/perf-stats.service';
import {
    SimulatorCompleteEvent,
    StartOffscreenCanvasWorkerEvent,
} from 'src/app/services/simulator/simulator.model';

import { DEFAULT_MISSION_PLAYBACK_SPEED, DEFAULT_MISSION_SUMMARY } from 'src/app/constants';
import {
    AddSubscriberEvent,
    StartMissionEvent,
    StopMissionEvent,
    UpdateMissionEvent,
    UpdateMissionPlaybackSpeedEvent,
} from 'src/app/workers/simulator/simulator.worker.model';

@Injectable({
    providedIn: 'root',
})
export class SimulatorService {
    private _perfStatsService: PerfStatsService;

    constructor(perfStatsService: PerfStatsService) {
        this._perfStatsService = perfStatsService;

        this._worker = new Worker(
            new URL('../../workers/simulator/simulator.worker', import.meta.url)
        );
        this._perfStatsService.addWorker();

        this._worker.addEventListener('message', (evt: MessageEvent<SimulatorCompleteEvent>) => {
            switch (evt.data.type) {
                case 'simulator-complete': {
                    this._missionIsRunning.next(false);
                    this._missionIsCompleted.next(true);
                    break;
                }
            }
        });

        this.setMissionSummary(DEFAULT_MISSION_SUMMARY);
    }

    private _worker: Worker;

    private _missionSummary = new BehaviorSubject<MissionSummary | null>(DEFAULT_MISSION_SUMMARY);

    private _missionIsRunning = new BehaviorSubject(false);

    private _missionIsCompleted = new BehaviorSubject(false);

    private _missionPlaybackSpeed = new BehaviorSubject(DEFAULT_MISSION_PLAYBACK_SPEED);

    public readonly missionId$ = this._missionSummary.pipe(map((ms) => ms?.missionId ?? null));

    public get missionSummary$(): Observable<MissionSummary | null> {
        return this._missionSummary.asObservable();
    }

    public get missionIsRunning$(): Observable<boolean> {
        return this._missionIsRunning.asObservable();
    }

    public get missionIsCompleted$(): Observable<boolean> {
        return this._missionIsCompleted.asObservable();
    }

    public get missionPlaybackSpeed$(): Observable<number> {
        return this._missionPlaybackSpeed.asObservable();
    }

    public setMissionIsCompleted(missionIsCompleted: boolean) {
        this._missionIsCompleted.next(missionIsCompleted);
    }

    public toggleMissionRunning() {
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

    public setMissionSummary(missionSummary: MissionSummary): void {
        this._missionSummary.next(missionSummary);
        this._worker.postMessage({
            type: 'update-mission',
            missionId: missionSummary.missionId,
        } satisfies UpdateMissionEvent);
    }

    public setMissionPlaybackSpeed(missionPlaybackSpeed: number) {
        this._missionPlaybackSpeed.next(missionPlaybackSpeed);
        this._worker.postMessage({
            type: 'update-mission-playback-speed',
            missionPlaybackSpeed,
        } satisfies UpdateMissionPlaybackSpeedEvent);
    }

    public startOffscreenCanvasWorker({
        workerId,
        hz,
        canvas,
        worker,
        properties,
        telemetryColors,
    }: {
        hz: number;
        worker: Worker;
        workerId: string;
        canvas: HTMLCanvasElement;
        properties: MissionDataProperty[];
        telemetryColors: Record<string, string>;
    }) {
        this._perfStatsService.addWorker();

        const channel = new MessageChannel();
        const offscreenCanvas = canvas.transferControlToOffscreen();

        // Pass port and canvas to offscreencanvas worker
        worker.postMessage(
            {
                type: 'start',
                dpr: window.devicePixelRatio,
                port: channel.port2,
                offscreenCanvas,
                telemetryColors,
            } satisfies StartOffscreenCanvasWorkerEvent,
            [channel.port2, offscreenCanvas]
        );

        // Pass port to simulator
        this._worker.postMessage(
            {
                id: workerId,
                type: 'add-subscriber',
                hz,
                properties,
                port: channel.port1,
            } satisfies AddSubscriberEvent,
            [channel.port1]
        );
    }
}
