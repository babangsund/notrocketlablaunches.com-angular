import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BrowserCheckComponent } from './components/browser-check/browser-check.component';
import { DeveloperStatsComponent } from './components/developer-stats/developer-stats.component';
import { HeaderComponent } from './components/header/header.component';
import { StartMissionComponent } from './components/start-mission/start-mission.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        CommonModule,
        RouterOutlet,
        HeaderComponent,
        StartMissionComponent,
        DeveloperStatsComponent,
        BrowserCheckComponent,
    ],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    public title = '(not) Rocket Lab Launches';
}
