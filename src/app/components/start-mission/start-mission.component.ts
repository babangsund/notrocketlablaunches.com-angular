import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SimulatorService } from '../../services/simulator/simulator.service';
import { getAppVersion } from '../../utils/getAppVersion';
import { ModalComponent } from '../modal/modal.component';

@Component({
    selector: 'app-start-mission',
    standalone: true,
    imports: [CommonModule, ModalComponent],
    templateUrl: './start-mission.component.html',
    styleUrls: ['./start-mission.component.scss'],
})
export class StartMissionComponent {
    _simulatorService: SimulatorService;

    constructor(simulatorService: SimulatorService) {
        this._simulatorService = simulatorService;

        this.launchTimeAsDate = this._simulatorService.missionSummary$.pipe(
            map((ms) => (ms?.launchDateMs ? new Date(ms?.launchDateMs) : new Date()))
        );
    }
    /**
     * Current version of the application.
     */
    appVersion = getAppVersion();
    /**
     * Mission has been started. When the mission has been started, this modal will no longer be shown.
     */
    missionStarted = false;
    /**
     * Binds the launch time with the JS Date object to access it in the template.
     */
    launchTimeAsDate: Observable<Date>;
    /**
     * Start the mission!
     */
    handleStartMission() {
        this.missionStarted = true;
        this._simulatorService.missionIsRunning$ = true;
    }
}
