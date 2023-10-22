import { CommonModule } from '@angular/common';
import { Component, HostBinding } from '@angular/core';

@Component({
    selector: 'app-launch',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './launch.component.html',
    styleUrls: ['./launch.component.scss'],
})
export class LaunchComponent {
    @HostBinding('attr.role')
    get role() {
        return 'main';
    }
}
