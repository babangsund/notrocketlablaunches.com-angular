import { BehaviorSubject, Observable } from 'rxjs';

export class FpsCounter {
    private readonly _fps = new BehaviorSubject(0);
    private _lastTimestamp = 0;
    private _frameCount = 0;
    private _frame = 0;

    public get fps$(): Observable<number> {
        return this._fps.asObservable();
    }

    public start(): void {
        this._frame = requestAnimationFrame(this._updateFps);
    }

    public stop(): void {
        cancelAnimationFrame(this._frame);
        this._fps.next(0);
    }

    private readonly _updateFps = (timestamp: DOMHighResTimeStamp): void => {
        if (this._lastTimestamp) {
            this._frameCount++;
            const elapsed = timestamp - this._lastTimestamp;

            if (elapsed >= 1000) {
                this._fps.next(this._frameCount);
                this._frameCount = 0;
                this._lastTimestamp = timestamp;
            }
        } else {
            this._lastTimestamp = timestamp;
        }
        this._frame = requestAnimationFrame(this._updateFps);
    };
}
