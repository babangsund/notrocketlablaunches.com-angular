import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WorkerId } from './perf-stats.service.model';

@Injectable({
    providedIn: 'root',
})
export class PerfStatsService {
    private readonly _workerFps = new BehaviorSubject<Record<WorkerId, number>>({});

    private readonly _workerCount = new BehaviorSubject(0);

    private readonly _showPerfStats = new BehaviorSubject(false);

    public get showPerfStats$(): Observable<boolean> {
        return this._showPerfStats.asObservable();
    }

    public toggleShowPerfStats(): void {
        this._showPerfStats.next(!this._showPerfStats.getValue());
    }

    public get workerFps$(): Observable<Record<WorkerId, number>> {
        return this._workerFps.asObservable();
    }

    public updateWorkerFps(workerId: WorkerId, fps: number): void {
        const workerFps = this._workerFps.value;
        workerFps[workerId] = fps;
        this._workerFps.next(workerFps);
    }

    public get workerCount$(): Observable<number> {
        return this._workerCount.asObservable();
    }

    public addWorker(): void {
        this._workerCount.next(this._workerCount.value + 1);
    }
}
