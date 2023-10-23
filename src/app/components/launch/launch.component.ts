import { CommonModule } from '@angular/common';
import { Component, HostBinding } from '@angular/core';
import { Timeline2dComponent } from '../timeline2d/timeline2d.component';

@Component({
    selector: 'app-launch',
    standalone: true,
    imports: [CommonModule, Timeline2dComponent],
    templateUrl: './launch.component.html',
    styleUrls: ['./launch.component.scss'],
})
export class LaunchComponent {
    @HostBinding('attr.role')
    public get role() {
        return 'main';
    }
}
