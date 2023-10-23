import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ElementRef,
    HostBinding,
    OnDestroy,
    Renderer2,
    ViewChild,
} from '@angular/core';
import { SimulatorService } from 'src/app/services/simulator/simulator.service';
import { createResizeObserver } from 'src/app/utils/createResizeListener';

@Component({
    selector: 'app-timeline2d',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './timeline2d.component.html',
    styleUrls: ['./timeline2d.component.scss'],
})
export class Timeline2dComponent implements AfterViewInit, OnDestroy {
    constructor(
        private _simulatorService: SimulatorService,
        private _hostElement: ElementRef,
        private _renderer: Renderer2
    ) {
        this._worker = new Worker(
            new URL('../../workers/timeline2d/timeline2d.worker', import.meta.url),
            { type: 'module' }
        );
    }

    public static id = 'Timeline2D';

    public static hz = 50;

    private _worker: Worker;

    private _unsubscribe: VoidFunction[] = [];

    @HostBinding('attr.role')
    public get role(): string {
        return 'region';
    }

    @HostBinding('attr.aria-label')
    public get 'aria-label'(): string {
        return 'Timeline 2D';
    }

    @ViewChild('canvas')
    private canvas: ElementRef<HTMLCanvasElement> | undefined;

    public ngAfterViewInit(): void {
        const canvas = this.canvas?.nativeElement;
        if (canvas !== undefined) {
            const dpr = window.devicePixelRatio;

            const boundingBox = canvas.getBoundingClientRect();
            const width = boundingBox.width;
            const height = boundingBox.height;

            this._renderer.setAttribute(canvas, 'width', String(width * dpr));
            this._renderer.setAttribute(canvas, 'height', String(height * dpr));

            this._simulatorService.startOffscreenCanvasWorker({
                canvas,
                properties: [],
                telemetryColors: {},
                hz: Timeline2dComponent.hz,
                worker: this._worker,
                workerId: Timeline2dComponent.id,
            });

            this.startResizeListener();
        }
    }

    public ngOnDestroy(): void {
        this._unsubscribe.forEach((u) => u());
    }

    private startResizeListener(): void {
        const canvas = this._hostElement.nativeElement;
        if (canvas) {
            const resizeObserver = createResizeObserver(canvas, ({ width, height }) => {
                const dpr = window.devicePixelRatio;
                this._worker.postMessage({
                    type: 'resize',
                    width: width * dpr,
                    height: height * dpr,
                });
            });
            this._unsubscribe.push(() => resizeObserver?.disconnect);
        }
    }
}
