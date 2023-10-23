/// <reference lib="webworker" />

import { startReportingWorkerFps } from 'src/app/utils/startReportingWorkerFps';
import { Timeline2d } from './Timeline2d';
import { Timeline2dWorkerEvent } from './timeline2d.worker.model';

const timeline2d = new Timeline2d();

startReportingWorkerFps(timeline2d.updateFps);

addEventListener('message', (evt) => {
    void onEvent(evt);
});

async function onEvent(evt: MessageEvent<Timeline2dWorkerEvent>): Promise<void> {
    switch (evt.data.type) {
        case 'start':
            timeline2d.start(evt.data);
            break;
        case 'resize':
            timeline2d.resize(evt.data);
            break;
    }
}
