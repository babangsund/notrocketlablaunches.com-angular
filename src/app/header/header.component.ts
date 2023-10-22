import { CommonModule } from '@angular/common';
import { Component, HostBinding } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { SimulatorService } from '../services/simulator/simulator.service';
import { getAppVersion } from '../utils/getAppVersion';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
    _simulatorService: SimulatorService;

    constructor(simulatorService: SimulatorService) {
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
        console.log('handleClickDeveloperStats');
    }

    handleClickMissionStatus() {
        console.log('handleClickMissionStatus');
    }

    handleChangeMissionPlaybackSpeed() {
        console.log('handleChangeMissionPlaybackSpeed');
    }
}
