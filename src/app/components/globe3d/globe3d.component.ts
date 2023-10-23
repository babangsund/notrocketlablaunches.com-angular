import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostBinding, ViewChild } from '@angular/core';
import { Observable, map } from 'rxjs';
import { MissionDataProperty } from 'src/app/data/data.model';
import { SimulatorSubscriberDirective } from 'src/app/directives/simulator-subscriber/simulator-subscriber.directive';
import { PerfStatsService } from 'src/app/services/perf-stats/perf-stats.service';
import { ZoomInEvent, ZoomOutEvent } from 'src/app/workers/globe3d/globe3d.worker.model';

@Component({
    selector: 'app-globe3d',
    standalone: true,
    imports: [CommonModule, SimulatorSubscriberDirective],
    templateUrl: './globe3d.component.html',
    styleUrls: ['./globe3d.component.scss'],
})
export class Globe3dComponent {
    public constructor(public perfStatsService: PerfStatsService) {
        this.worker = new Worker(new URL('../../workers/globe3d/globe3d.worker', import.meta.url), {
            type: 'module',
        });

        this.fps$ = perfStatsService.workerFps$.pipe(map((workers) => workers[this.id]));
    }

    public readonly id = 'Globe3D';

    public readonly hz = 50;

    public readonly worker: Worker;

    public readonly fps$: Observable<number>;

    public readonly missionDataProperties: MissionDataProperty[] = [
        'S1Altitude',
        'S1Latitude',
        'S1Longitude',
        'S1PlannedAltitude',
        'S1PlannedLatitude',
        'S1PlannedLongitude',
        'S2Altitude',
        'S2Latitude',
        'S2Longitude',
        'S2PlannedAltitude',
        'S2PlannedLatitude',
        'S2PlannedLongitude',
    ];

    @HostBinding('attr.role')
    public get role(): string {
        return 'region';
    }

    @HostBinding('attr.aria-label')
    public get 'aria-label'(): string {
        return 'Globe 3D';
    }

    @ViewChild('canvas') private readonly _canvas: ElementRef | null = null;

    public handleZoomIn(): void {
        this.worker.postMessage({ type: 'zoom-in', wheel: false } satisfies ZoomInEvent);
    }

    public handleZoomOut(): void {
        this.worker.postMessage({ type: 'zoom-out', wheel: false } satisfies ZoomOutEvent);
    }

    public readonly startWheelListener = (): VoidFunction => {
        const canvas = this._canvas?.nativeElement;
        if (canvas) {
            const listener = (event: WheelEvent): void => {
                event.preventDefault();
                const zoomType = event.deltaY > 0 ? 'zoom-out' : 'zoom-in';
                this.worker.postMessage({
                    type: zoomType,
                    wheel: true,
                    delta: Math.abs(event.deltaY),
                } satisfies ZoomInEvent | ZoomOutEvent);
            };
            canvas.addEventListener('wheel', listener);
            return () => canvas.removeEventListener('wheel', listener);
        }
        return () => void {};
    };
}
