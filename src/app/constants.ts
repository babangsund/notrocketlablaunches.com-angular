import missionSummaries from './data/missionSummaries.json';

const missionEntries = Object.entries(missionSummaries);

export const DEFAULT_MISSION_SUMMARY = missionEntries[0][1];
export const DEFAULT_MISSION_PLAYBACK_SPEED = 10;
