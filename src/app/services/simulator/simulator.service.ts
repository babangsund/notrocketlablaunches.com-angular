import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { MissionSummary } from 'src/app/model/mission.model';
import { PerfStatsService } from 'src/app/perf-stats/perf-stats.service';
import {
    SimulatorCompleteEvent,
    StartOffscreenCanvasWorkerEvent,
    StartSimulatorConsumerEvent,
} from 'src/app/services/simulator/simulator.model';

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
                    this.missionIsRunning$ = false;
                    this.missionIsCompleted$ = true;
                    break;
                }
            }
        });
    }

    private _worker: Worker;

    private _missionSummary = new BehaviorSubject<MissionSummary | null>(null);

    private _missionIsRunning = new BehaviorSubject(false);

    private _missionIsCompleted = new BehaviorSubject(false);

    private _missionPlaybackSpeed = new BehaviorSubject(10);

    public readonly missionId$ = this._missionSummary.pipe(map((ms) => ms?.missionId ?? null));

    public get missionSummary$(): Observable<MissionSummary | null> {
        return this._missionSummary.asObservable();
    }

    public set missionSummary$(missionSummary: MissionSummary) {
        this._worker.postMessage({ type: 'set-mission', missionId: missionSummary.missionId });
        this._missionSummary.next(missionSummary);
    }

    public get missionIsRunning$(): Observable<boolean> {
        return this._missionIsRunning.asObservable();
    }

    public set missionIsRunning$(missionIsRunning: boolean) {
        this._worker.postMessage({ type: missionIsRunning ? 'start-mission' : 'stop-mission' });
        this._missionIsRunning.next(missionIsRunning);
    }

    public get missionIsCompleted$(): Observable<boolean> {
        return this._missionIsCompleted.asObservable();
    }

    public set missionIsCompleted$(missionIsCompleted: boolean) {
        this._missionIsCompleted.next(missionIsCompleted);
    }

    public get missionPlaybackSpeed$(): Observable<number> {
        return this._missionPlaybackSpeed.asObservable();
    }

    public set missionPlaybackSpeed$(missionPlaybackSpeed: number) {
        this._worker.postMessage({ type: 'mission-playback-speed', missionPlaybackSpeed });
        this._missionPlaybackSpeed.next(missionPlaybackSpeed);
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
