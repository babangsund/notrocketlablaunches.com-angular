/// <reference lib="webworker" />

import { loadFontFaceSet } from 'src/app/utils/loadFontFaceSet';
import { startReportingWorkerFps } from 'src/app/utils/startReportingWorkerFps';
import { LineChart2d } from './LineChart2d';
import { LineChart2dWorkerEvent } from './line-chart2d.worker.model';

const lineChart2d = new LineChart2d();

const fontFaceSet = loadFontFaceSet(self.fonts, LineChart2d.fonts);

startReportingWorkerFps();

addEventListener('message', onEvent);

async function onEvent(evt: MessageEvent<LineChart2dWorkerEvent>): Promise<void> {
    switch (evt.data.type) {
        case 'start':
            await fontFaceSet;
            lineChart2d.start(evt.data);
            break;
        case 'resize':
            lineChart2d.resize(evt.data);
            break;
    }
}
