import missionSummaries from './data/missionSummaries.json';

const missionEntries = Object.entries(missionSummaries);

export const DEFAULT_MISSION_SUMMARY = missionEntries[0][1];
export const DEFAULT_MISSION_PLAYBACK_SPEED = 10;
export const TELEMETRY_SOURCE_RATE_HZ = 100;
export const THEME_COLOR = '#e12726';
