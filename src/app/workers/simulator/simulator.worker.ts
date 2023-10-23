/// <reference lib="webworker" />

import { startReportingWorkerFps } from 'src/app/utils/startReportingWorkerFps';
import { Simulator } from './Simulator';
import {
    isAddSubscriberEvent,
    isUpdateMissionPlaybackSpeedEvent,
    isUpdateSubscriberEvent,
    type ToSimulatorWorkerEvent,
} from './simulator.worker.model';

const simulator = new Simulator();

startReportingWorkerFps();

addEventListener('message', (evt: MessageEvent<ToSimulatorWorkerEvent>) => {
    switch (evt.data.type) {
        case 'start-mission': {
            simulator.startMission();
            break;
        }
        case 'stop-mission': {
            simulator.stopMission();
            break;
        }
        case 'update-mission': {
            simulator.updateMission(evt.data.missionId);
            break;
        }
        case 'update-mission-playback-speed': {
            if (isUpdateMissionPlaybackSpeedEvent(evt)) {
                simulator.updateMissionPlaybackSpeed(evt.data.missionPlaybackSpeed);
            }
            break;
        }
        case 'add-subscriber': {
            if (isAddSubscriberEvent(evt)) {
                simulator.addSubscriber(evt.data);
            }
            break;
        }
        case 'update-subscriber': {
            if (isUpdateSubscriberEvent(evt)) simulator.updateSubscriber(evt.data);
            break;
        }
    }
});
