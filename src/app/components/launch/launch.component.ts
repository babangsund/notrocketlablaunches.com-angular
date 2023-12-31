import { CommonModule } from '@angular/common';
import { Component, HostBinding } from '@angular/core';
import { Globe3dComponent } from '../globe3d/globe3d.component';
import { LineChart2dComponent } from '../line-chart2d/line-chart2d.component';
import { Timeline2dComponent } from '../timeline2d/timeline2d.component';

@Component({
    selector: 'app-launch',
    standalone: true,
    imports: [CommonModule, Timeline2dComponent, LineChart2dComponent, Globe3dComponent],
    templateUrl: './launch.component.html',
    styleUrls: ['./launch.component.scss'],
})
export class LaunchComponent {
    @HostBinding('attr.role')
    public get role(): string {
        return 'main';
    }
}
