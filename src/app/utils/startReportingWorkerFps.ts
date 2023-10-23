import { FpsCounter } from './FpsCounter';

export interface FpsEvent {
    type: 'fps';
    fps: number;
}

export function isFpsEvent(evt: MessageEvent<FpsEvent>): evt is MessageEvent<FpsEvent> {
    return evt.data.type === 'fps';
}

export function startReportingWorkerFps(callback?: (fps: number) => void): void {
    const fpsCounter = new FpsCounter();
    fpsCounter.fps$.subscribe((fps) => {
        postMessage({ type: 'fps', fps });
        callback?.(fps);
    });
    fpsCounter.start();
}
