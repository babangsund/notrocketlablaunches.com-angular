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
    constructor(public simulatorService: SimulatorService) {
        this.launchTimeAsDate = this.simulatorService.missionSummary$.pipe(
            map((ms) => (ms?.launchDateMs ? new Date(ms?.launchDateMs) : new Date()))
        );
    }
    /**
     * Current version of the application.
     */
    public appVersion = getAppVersion();
    /**
     * Mission has been started. When the mission has been started, this modal will no longer be shown.
     */
    public missionStarted = false;
    /**
     * Binds the launch time with the JS Date object to access it in the template.
     */
    public launchTimeAsDate: Observable<Date>;
    /**
     * Start the mission!
     */
    public handleStartMission(): void {
        this.missionStarted = true;
        this.simulatorService.toggleMissionRunning();
    }
}
