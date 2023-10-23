import {
    MissionDataProperty,
    MissionEvents,
    MissionStages,
    MissionSummary,
} from 'src/app/data/data.model';
import { FpsEvent } from 'src/app/utils/startReportingWorkerFps';
import { BatchedData } from '../worker.model';

export interface Subscriber {
    id: string;
    hz: number;
    port: MessagePort;
    batchedData: BatchedData;
    interval: ReturnType<typeof setInterval>;
    missionDataProperties: MissionDataProperty[];
}

export interface UpdateMissionEvent {
    type: 'update-mission';
    missionId: string;
}

export interface StartMissionEvent {
    type: 'start-mission';
}

export interface StopMissionEvent {
    type: 'stop-mission';
}

export interface UpdateMissionPlaybackSpeedEvent {
    type: 'update-mission-playback-speed';
    missionPlaybackSpeed: number;
}

export interface AddSubscriberEvent {
    type: 'add-subscriber';
    id: string;
    port: MessagePort;
    hz: number;
    missionDataProperties: MissionDataProperty[];
}

export interface UpdateSubscriberEvent {
    type: 'update-subscriber';
    id: string;
    hz: number;
}

export type ToSimulatorWorkerEvent =
    | UpdateMissionEvent
    | StartMissionEvent
    | StopMissionEvent
    | AddSubscriberEvent
    | UpdateSubscriberEvent
    | UpdateMissionPlaybackSpeedEvent;

export function isAddSubscriberEvent(
    evt: MessageEvent<ToSimulatorWorkerEvent>
): evt is MessageEvent<AddSubscriberEvent> {
    return evt.data.type === 'add-subscriber';
}

export function isUpdateSubscriberEvent(
    evt: MessageEvent<ToSimulatorWorkerEvent>
): evt is MessageEvent<UpdateSubscriberEvent> {
    return evt.data.type === 'update-subscriber';
}

export function isUpdateMissionPlaybackSpeedEvent(
    evt: MessageEvent<ToSimulatorWorkerEvent>
): evt is MessageEvent<UpdateMissionPlaybackSpeedEvent> {
    return evt.data.type === 'update-mission-playback-speed';
}

export interface MissionCompleteEvent {
    type: 'mission-complete';
}

export type FromSimulatorWorkerEvent = MissionCompleteEvent | FpsEvent;

export interface InitialDataEvent {
    type: 'initial-data';
    missionTimeSec: number;
    missionId: MissionSummary['missionId'];
    missionSummary: MissionSummary;
    missionStages: MissionStages;
    missionEvents: MissionEvents;
    /**
     * All data produced up until this point in time.
     */
    missionData: BatchedData;
}

export interface BatchedDataEvent {
    type: 'batched-data';
    missionTimeSec: number;
    /**
     * New data since the last batched-data event.
     */
    missionData: BatchedData;
}

export type FromSimulatorToSubscriberEvent = InitialDataEvent | BatchedDataEvent;

export function isInitialDataEvent(
    evt: MessageEvent<FromSimulatorToSubscriberEvent>
): evt is MessageEvent<InitialDataEvent> {
    return evt.data.type === 'initial-data';
}

export function isBatchedDataEvent(
    evt: MessageEvent<FromSimulatorToSubscriberEvent>
): evt is MessageEvent<BatchedDataEvent> {
    return evt.data.type === 'batched-data';
}
