export interface StartEvent {
    type: 'start';
    dpr: number;
    port: MessagePort;
    offscreenCanvas: OffscreenCanvas;
}

export interface ResizeEvent {
    type: 'resize';
    width: number;
    height: number;
}

export type Timeline2dWorkerEvent = StartEvent | ResizeEvent;
