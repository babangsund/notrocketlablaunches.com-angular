export interface ZoomInEvent {
    type: 'zoom-in';
    wheel: boolean;
    delta?: number;
}

export interface ZoomOutEvent {
    type: 'zoom-out';
    wheel: boolean;
    delta?: number;
}

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

export type Globe3dWorkerEvent = StartEvent | ResizeEvent | ZoomInEvent | ZoomOutEvent;
