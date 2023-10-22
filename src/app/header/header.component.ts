import { CommonModule } from '@angular/common';
import { Component, HostBinding } from '@angular/core';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
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

    appVersion = '0.0.1';

    missionStatus = 'Running';

    missionSummary = { missionName: 'Stronger Together' };

    missionPlaybackSpeed = 10;
}
