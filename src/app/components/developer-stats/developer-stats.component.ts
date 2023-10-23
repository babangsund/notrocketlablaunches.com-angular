import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PerfStatsService } from 'src/app/services/perf-stats/perf-stats.service';
import { WorkerId } from 'src/app/services/perf-stats/perf-stats.service.model';
import { FpsCounter } from 'src/app/utils/FpsCounter';

@Component({
    selector: 'app-developer-stats',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './developer-stats.component.html',
    styleUrls: ['./developer-stats.component.scss'],
})
export class DeveloperStatsComponent implements OnDestroy {
    public constructor(public perfStatsService: PerfStatsService) {
        this.workerFpsEntries = this.perfStatsService.workerFps$.pipe(map(Object.entries));
        this.fpsCounter = new FpsCounter();

        this._unsubscribe.push(this.fpsCounter.stop);
        this._unsubscribe.push(
            this.perfStatsService.showPerfStats$.subscribe((showPerfStats) => {
                if (showPerfStats) this.fpsCounter.start();
                else this.fpsCounter.stop();
            }).unsubscribe
        );
    }

    private readonly _unsubscribe: VoidFunction[] = [];

    public readonly fpsCounter = new FpsCounter();

    public readonly workerFpsEntries: Observable<
        ReturnType<typeof Object.entries<Record<WorkerId, number>>>
    >;

    public ngOnDestroy(): void {
        this._unsubscribe.forEach((u) => u());
    }
}
