/// <reference lib="webworker" />

import { startReportingWorkerFps } from 'src/app/utils/startReportingWorkerFps';
import { Globe3d } from './Globe3d';
import { Globe3dWorkerEvent } from './globe3d.worker.model';

const globe3d = new Globe3d();

startReportingWorkerFps();

addEventListener('message', onEvent);

function onEvent(evt: MessageEvent<Globe3dWorkerEvent>): void {
    switch (evt.data.type) {
        case 'start':
            globe3d.start(evt.data);
            break;
        case 'resize':
            globe3d.resize(evt.data);
            break;
        case 'zoom-in':
            globe3d.zoomIn(evt.data);
            break;
        case 'zoom-out':
            globe3d.zoomOut(evt.data);
            break;
    }
}
