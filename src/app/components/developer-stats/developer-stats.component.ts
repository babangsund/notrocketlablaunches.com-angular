import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { Observable, map } from 'rxjs';
import { WorkerId } from 'src/app/services/perf-stats/perf-stats.model';
import { PerfStatsService } from 'src/app/services/perf-stats/perf-stats.service';
import { makeFpsCounter } from 'src/app/utils/makeFpsCounter';

@Component({
    selector: 'app-developer-stats',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './developer-stats.component.html',
    styleUrls: ['./developer-stats.component.scss'],
})
export class DeveloperStatsComponent implements OnDestroy {
    _perfStatsService: PerfStatsService;

    workerFpsEntries: Observable<ReturnType<typeof Object.entries<Record<WorkerId, number>>>>;

    mainThreadFps: Observable<number>;

    stopFpsCounter: VoidFunction;

    constructor(perfStatsService: PerfStatsService) {
        this._perfStatsService = perfStatsService;

        this.workerFpsEntries = this._perfStatsService.workerFps$.pipe(map(Object.entries));

        const { fps, stop, start } = makeFpsCounter();
        this.stopFpsCounter = stop;
        start();
        this.mainThreadFps = fps;
    }

    ngOnDestroy(): void {
        this.stopFpsCounter();
    }
}
