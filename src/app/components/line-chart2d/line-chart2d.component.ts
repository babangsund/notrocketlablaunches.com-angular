import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input, OnInit } from '@angular/core';
import { Observable, map } from 'rxjs';
import { DEFAULT_DATA_DISPLAY_HZ, THEME_COLOR } from 'src/app/constants';
import { MissionDataProperty } from 'src/app/data/data.model';
import { SimulatorSubscriberDirective } from 'src/app/directives/simulator-subscriber/simulator-subscriber.directive';
import { PerfStatsService } from 'src/app/services/perf-stats/perf-stats.service';
import { SimulatorService } from 'src/app/services/simulator/simulator.service';
import { SelectHzComponent } from '../select-hz/select-hz.component';

@Component({
    selector: 'app-line-chart2d',
    standalone: true,
    imports: [CommonModule, SimulatorSubscriberDirective, SelectHzComponent],
    templateUrl: './line-chart2d.component.html',
    styleUrls: ['./line-chart2d.component.scss'],
})
export class LineChart2dComponent implements OnInit {
    public constructor(
        private readonly _simulatorService: SimulatorService,
        public perfStatsService: PerfStatsService
    ) {
        this.worker = new Worker(
            new URL('../../workers/line-chart2d/line-chart2d.worker', import.meta.url),
            { type: 'module' }
        );

        this.fps$ = perfStatsService.workerFps$.pipe(map((workers) => workers[this.id]));
    }

    public id = '';

    public readonly hz = DEFAULT_DATA_DISPLAY_HZ;

    public readonly worker: Worker;

    public readonly fps$: Observable<number>;

    public readonly colors: Record<string, string> = {};

    public legend: { color: string; label: string }[] = [];

    @Input({ required: true })
    public title = '';

    @Input({ required: true })
    public unit = '';

    @Input({ required: true })
    public missionDataProperties: MissionDataProperty[] = [];

    @HostBinding('attr.role')
    public get role(): string {
        return 'region';
    }

    @HostBinding('attr.aria-label')
    public get 'aria-label'(): string {
        return 'Line Chart 2D';
    }

    public ngOnInit(): void {
        this.id = `${this.title}-${Math.random().toFixed(3)}`;

        this.missionDataProperties.forEach((property, index) => {
            this.colors[property] = LineChart2dComponent._availableColors[index];
        });

        this.legend = this.missionDataProperties.map((property, idx) => {
            const prettifiedProp = property
                .replace(/([0-9])/g, '$1 ')
                .replace(/([A-Z][a-z])/g, ' $1')
                .replace('RP1', 'RP-1')
                .replace('Pressure', 'Pres.');

            return {
                color: LineChart2dComponent._availableColors[idx],
                label: prettifiedProp.charAt(0).toUpperCase() + prettifiedProp.substring(1),
            };
        });
    }

    public handleChangeHz(hz: number): void {
        this._simulatorService.updateSubscriber(this.id, hz);
    }

    private static readonly _availableColors = [
        THEME_COLOR,
        '#fff',
        '#486de8',
        '#e07f9d',
        '#018977',
        '#b088f5',
        '#c55305',
        '#8ea9ff',
        '#ffb0c8',
        '#40bfa9',
        '#d6baff',
        '#f89256',
        '#c3d1ff',
        '#ffdfe8',
    ];
}
