import { CommonModule } from '@angular/common';
import { Component, HostBinding } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { PerfStatsService } from 'src/app/services/perf-stats/perf-stats.service';
import { SimulatorService } from '../../services/simulator/simulator.service';
import { getAppVersion } from '../../utils/getAppVersion';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
    public constructor(
        private readonly _perfStatsService: PerfStatsService,
        public simulatorService: SimulatorService
    ) {
        this.missionStatus$ = combineLatest(
            this.simulatorService.missionIsCompleted$,
            this.simulatorService.missionIsRunning$
        ).pipe(
            map(([missionIsCompleted, missionIsRunning]) =>
                missionIsCompleted ? 'Completed' : missionIsRunning ? 'Running' : 'Paused'
            )
        );
    }

    public appVersion = getAppVersion();

    public missionStatus$: Observable<string>;

    @HostBinding('attr.role')
    public get role(): string {
        return 'banner';
    }

    public handleClickDeveloperStats(): void {
        this._perfStatsService.toggleShowPerfStats();
    }

    public handleClickMissionStatus(): void {
        this.simulatorService.toggleMissionRunning();
    }

    public handleChangeMissionPlaybackSpeed(evt: Event): void {
        const missionPlaybackSpeed = parseInt((evt.target as HTMLSelectElement).value);
        this.simulatorService.updateMissionPlaybackSpeed(missionPlaybackSpeed);
    }
}
