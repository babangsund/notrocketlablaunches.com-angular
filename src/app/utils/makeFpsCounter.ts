import { BehaviorSubject, Observable } from 'rxjs';

interface FpsCounter {
    fps: Observable<number>;
    start: () => number;
    stop: VoidFunction;
}

export function makeFpsCounter(): FpsCounter {
    // FPS value needs to be wrapped in an object so we can pass the FPS pointer instead of the current value.
    // This way, consumers can peek at the value whenever they want. (as opposed to calling a provided callback every second)
    const fps = new BehaviorSubject(0);
    let lastTimestamp = 0;
    let frameCount = 0;
    let frame = 0;

    function updateFPS(timestamp: DOMHighResTimeStamp): void {
        if (lastTimestamp) {
            frameCount++;
            const elapsed = timestamp - lastTimestamp;

            if (elapsed >= 1000) {
                fps.next(frameCount);
                frameCount = 0;
                lastTimestamp = timestamp;
            }
        } else {
            lastTimestamp = timestamp;
        }
        frame = requestAnimationFrame(updateFPS);
    }

    return {
        fps: fps.asObservable(),
        start: () => requestAnimationFrame(updateFPS),
        stop: () => {
            cancelAnimationFrame(frame);
            fps.next(0);
            fps.complete();
        },
    };
}
