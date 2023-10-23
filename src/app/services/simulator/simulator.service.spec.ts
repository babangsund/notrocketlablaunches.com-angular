import { TestBed } from '@angular/core/testing';

import { DEFAULT_MISSION_SUMMARY } from 'src/app/constants';
import { MockWorker } from 'src/app/mock/MockWorker';
import { SimulatorService } from './simulator.service';

describe('SimulatorService', () => {
    let service: SimulatorService;
    let mockWorker: jasmine.SpyObj<Worker>;

    const originalWorker = window.Worker;
    (window as any).Worker = MockWorker;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [SimulatorService],
        });

        service = TestBed.inject(SimulatorService);
        mockWorker = (service as any)['_worker'];
    });

    afterAll(() => {
        window.Worker = originalWorker;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should update mission is completed', () => {
        service.missionIsCompleted$
            .subscribe((isCompleted) => expect(isCompleted).toBeFalse())
            .unsubscribe();

        service.updateMissionIsCompleted(true);

        service.missionIsCompleted$
            .subscribe((isCompleted) => expect(isCompleted).toBeTrue())
            .unsubscribe();
    });

    it('should toggle mission running', () => {
        const spy = spyOn(service, 'toggleMissionRunning').and.callThrough();
        service.toggleMissionRunning();
        expect(spy).toHaveBeenCalled();
    });

    it('should update mission summary', () => {
        service.missionSummary$
            .subscribe((summary) => expect(summary?.missionName).toBe('Stronger Together'))
            .unsubscribe();

        const testSummary = {
            ...DEFAULT_MISSION_SUMMARY,
            missionName: 'Test Mission',
        };

        service.updateMissionSummary(testSummary);

        service.missionSummary$
            .subscribe((summary) => expect(summary?.missionName).toBe('Test Mission'))
            .unsubscribe();
    });

    it('should update mission playback speed', () => {
        const testSpeed = 60;

        service.updateMissionPlaybackSpeed(testSpeed);
        service.missionPlaybackSpeed$.subscribe((speed) => expect(speed).toBe(testSpeed));
    });

    it('should post message to worker to start mission when toggling mission running', () => {
        service.toggleMissionRunning();

        expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'start-mission' });
    });

    it('should post message to worker to stop mission when toggling mission running again', () => {
        service.toggleMissionRunning(); // Start
        service.toggleMissionRunning(); // Stop

        expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'stop-mission' });
    });

    it('should post updated mission to worker', () => {
        const testSummary = {
            ...DEFAULT_MISSION_SUMMARY,
            missionName: 'Test Mission 2',
        };

        service.updateMissionSummary(testSummary);

        expect(mockWorker.postMessage).toHaveBeenCalledWith({
            type: 'update-mission',
            missionId: testSummary.missionId,
        });
    });

    it('should post updated playback speed to worker', () => {
        const speed = 75;

        service.updateMissionPlaybackSpeed(speed);

        expect(mockWorker.postMessage).toHaveBeenCalledWith({
            type: 'update-mission-playback-speed',
            missionPlaybackSpeed: speed,
        });
    });

    it('should post message to worker to add subscriber', () => {
        const subscriberData = {
            hz: 60,
            worker: new Worker(''),
            workerId: 'testId',
            canvas: document.createElement('canvas'),
            missionDataProperties: [],
            colors: {},
        };

        service.addSubscriber(subscriberData);

        expect(mockWorker.postMessage).toHaveBeenCalledWith(
            {
                type: 'add-subscriber',
                hz: subscriberData.hz,
                id: subscriberData.workerId,
                port: jasmine.any(MessagePort),
                missionDataProperties: subscriberData.missionDataProperties,
            },
            jasmine.arrayContaining([new MessageChannel().port1])
        );
    });
});
