import { MissionDataProperty } from '../data/data.model';

export type BatchedData = Partial<Record<MissionDataProperty, number[]>>;
