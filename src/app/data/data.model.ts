export type MissionDataProperty = string;

export interface MissionSummary {
    missionId: string;
    missionName: string;
    rocketModel: string;
    rocketName: string;
    launchDateMs: number;
    launchSiteName: string;
}

export interface MissionStages {
    S1: string;
    S2: string;
    [key: string]: string;
}

export interface MissionEvent {
    title: string;
    timeFromLaunchSec: number;
}

export type MissionEvents = MissionEvent[];

export type MissionData = Record<MissionDataProperty, number[][]>;

export interface Mission {
    missionId: string;
    missionSummary: MissionSummary;
    missionStages: MissionStages;
    missionEvents: MissionEvents;
    missionData: MissionData;
}
