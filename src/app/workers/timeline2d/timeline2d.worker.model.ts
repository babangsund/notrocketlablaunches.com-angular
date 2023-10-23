import { MissionDataProperty } from 'src/app/data/data.model';

export interface StartEvent {
    type: 'start';
    dpr: number;
    unit: string;
    port: MessagePort;
    offscreenCanvas: OffscreenCanvas;
    colors: Record<MissionDataProperty, string>;
}

export interface ResizeEvent {
    type: 'resize';
    width: number;
    height: number;
}

export type Timeline2dWorkerEvent = StartEvent | ResizeEvent;
