export interface SimulatorCompleteEvent {
    type: 'simulator-complete';
}

export interface StartSimulatorConsumerEvent {
    type: 'start-simulator-consumer';
    consumerId: string;
    hz: number;
    port: MessagePort;
    telemetry: string[];
}

export interface StartOffscreenCanvasWorkerEvent {
    type: 'start';
    dpr: number;
    port: MessagePort;
    offscreenCanvas: OffscreenCanvas;
    telemetryColors: Record<string, string>;
}
