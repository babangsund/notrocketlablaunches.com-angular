import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, Renderer2 } from '@angular/core';
import { MissionDataProperty } from 'src/app/data/data.model';
import { SimulatorService } from 'src/app/services/simulator/simulator.service';
import { createResizeObserver } from 'src/app/utils/createResizeListener';

@Directive({
    selector: '[appSimulatorSubscriber]',
    standalone: true,
})
export class SimulatorSubscriberDirective implements AfterViewInit, OnDestroy {
    public constructor(
        private readonly _canvas: ElementRef,
        private readonly _renderer: Renderer2,
        private readonly _simulatorService: SimulatorService
    ) {}

    private readonly _unsubscribe: VoidFunction[] = [];

    @Input({ required: true }) public hz: number | undefined;
    @Input({ required: true }) public id: string | undefined;
    @Input({ required: true }) public worker: Worker | undefined;
    @Input() public unit = '';
    @Input() public colors: Record<MissionDataProperty, string> = {};
    @Input() public listeners: (() => VoidFunction)[] = [];
    @Input() public missionDataProperties: MissionDataProperty[] = [];

    public ngAfterViewInit(): void {
        const canvas = this._canvas.nativeElement;
        const { id, hz, unit, worker, colors, listeners, missionDataProperties } = this;
        if (canvas && id && hz && worker) {
            const dpr = window.devicePixelRatio;

            const boundingBox = canvas.getBoundingClientRect();
            const width = boundingBox.width;
            const height = boundingBox.height;

            this._renderer.setAttribute(canvas, 'width', String(width * dpr));
            this._renderer.setAttribute(canvas, 'height', String(height * dpr));

            // Add subscriber to simulator service
            this._simulatorService.addSubscriber({
                workerId: id,
                hz,
                unit,
                canvas,
                worker,
                colors,
                missionDataProperties,
            });

            this._startResizeListener();

            // Start listeners and add to unsubscribe list
            listeners?.forEach((start) => this._unsubscribe.push(start()));
        }
    }

    public ngOnDestroy(): void {
        this._unsubscribe.forEach((u) => u());
    }

    private _startResizeListener(): void {
        const canvas = this._canvas.nativeElement;
        const worker = this.worker;
        if (canvas && worker) {
            const resizeObserver = createResizeObserver(canvas, ({ width, height }) => {
                const dpr = window.devicePixelRatio;
                worker.postMessage({
                    type: 'resize',
                    width: width * dpr,
                    height: height * dpr,
                });
            });

            this._unsubscribe.push(() => resizeObserver?.disconnect());
        }
    }
}
