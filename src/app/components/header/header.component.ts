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
    _perfStatsService: PerfStatsService;
    _simulatorService: SimulatorService;

    constructor(perfStatsService: PerfStatsService, simulatorService: SimulatorService) {
        this._perfStatsService = perfStatsService;
        this._simulatorService = simulatorService;

        this.missionStatus$ = combineLatest(
            this._simulatorService.missionIsCompleted$,
            this._simulatorService.missionIsRunning$
        ).pipe(
            map(([missionIsCompleted, missionIsRunning]) =>
                missionIsCompleted ? 'Completed' : missionIsRunning ? 'Running' : 'Paused'
            )
        );
    }

    appVersion = getAppVersion();

    missionStatus$: Observable<string>;

    @HostBinding('attr.role')
    get role() {
        return 'banner';
    }

    handleClickDeveloperStats() {
        this._perfStatsService.showPerfStats$ = true;
    }

    handleClickMissionStatus() {
        this._simulatorService.toggleMissionRunning();
    }

    handleChangeMissionPlaybackSpeed(evt: Event) {
        const missionPlaybackSpeed = parseInt((evt.target as HTMLSelectElement).value);
        this._simulatorService.missionPlaybackSpeed$ = missionPlaybackSpeed;
    }
}
