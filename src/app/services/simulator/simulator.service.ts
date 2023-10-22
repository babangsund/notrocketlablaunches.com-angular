import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { MissionSummary } from 'src/app/data/data.model';
import { PerfStatsService } from 'src/app/services/perf-stats/perf-stats.service';
import {
    SimulatorCompleteEvent,
    StartOffscreenCanvasWorkerEvent,
    StartSimulatorConsumerEvent,
} from 'src/app/services/simulator/simulator.model';

import { DEFAULT_MISSION_PLAYBACK_SPEED, DEFAULT_MISSION_SUMMARY } from 'src/app/constants';

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
        this._worker.postMessage({ type: missionIsRunning ? 'start-mission' : 'stop-mission' });
    }

    public setMissionSummary(missionSummary: MissionSummary): void {
        this._missionSummary.next(missionSummary);
        this._worker.postMessage({ type: 'set-mission', missionId: missionSummary.missionId });
    }

    public setMissionPlaybackSpeed(missionPlaybackSpeed: number) {
        this._missionPlaybackSpeed.next(missionPlaybackSpeed);
        this._worker.postMessage({ type: 'mission-playback-speed', missionPlaybackSpeed });
    }

    public startOffscreenCanvasWorker({
        workerId,
        hz,
        canvas,
        worker,
        telemetry,
        telemetryColors,
    }: {
        hz: number;
        workerId: string;
        worker: Worker;
        telemetry: string[];
        canvas: HTMLCanvasElement;
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
                type: 'start-simulator-consumer',
                hz,
                telemetry,
                port: channel.port1,
                consumerId: workerId,
            } satisfies StartSimulatorConsumerEvent,
            [channel.port1]
        );
    }
}
