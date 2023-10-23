import { CommonModule } from '@angular/common';
import { Component, HostBinding } from '@angular/core';
import { DEFAULT_DATA_DISPLAY_HZ } from 'src/app/constants';
import { SimulatorSubscriberDirective } from 'src/app/directives/simulator-subscriber/simulator-subscriber.directive';

@Component({
    selector: 'app-timeline2d',
    standalone: true,
    imports: [CommonModule, SimulatorSubscriberDirective],
    templateUrl: './timeline2d.component.html',
    styleUrls: ['./timeline2d.component.scss'],
})
export class Timeline2dComponent {
    public constructor() {
        this.worker = new Worker(
            new URL('../../workers/timeline2d/timeline2d.worker', import.meta.url),
            { type: 'module' }
        );
    }

    public readonly id = 'Timeline2D';

    public readonly hz = DEFAULT_DATA_DISPLAY_HZ;

    public readonly worker: Worker;

    @HostBinding('attr.role')
    public get role(): string {
        return 'region';
    }

    @HostBinding('attr.aria-label')
    public get 'aria-label'(): string {
        return 'Timeline 2D';
    }
}
