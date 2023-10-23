/// <reference lib="webworker" />

import { startReportingWorkerFps } from 'src/app/utils/startReportingWorkerFps';
import { LineChart2d } from './LineChart2d';
import { LineChart2dWorkerEvent } from './line-chart2d.worker.model';

const lineChart2d = new LineChart2d();

startReportingWorkerFps();

addEventListener('message', onEvent);

function onEvent(evt: MessageEvent<LineChart2dWorkerEvent>): void {
    switch (evt.data.type) {
        case 'start':
            lineChart2d.start(evt.data);
            break;
        case 'resize':
            lineChart2d.resize(evt.data);
            break;
    }
}
