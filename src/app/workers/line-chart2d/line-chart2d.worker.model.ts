import { MissionDataProperty } from 'src/app/data/data.model';

export interface DrawingOptions {
    ctx: OffscreenCanvasRenderingContext2D;
    minY: number;
    maxY: number;
    minX: number;
    maxX: number;
    prettyYInterval: number;
    canvasWidth: number;
    canvasHeight: number;
}

interface StartEvent {
    type: 'start';
    dpr: number;
    unit: string;
    port: MessagePort;
    offscreenCanvas: OffscreenCanvas;
    colors: Record<MissionDataProperty, string>;
}

interface ResizeEvent {
    type: 'resize';
    width: number;
    height: number;
}

export type LineChart2dWorkerEvent = StartEvent | ResizeEvent;
