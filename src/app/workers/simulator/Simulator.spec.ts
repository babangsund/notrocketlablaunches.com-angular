import { TELEMETRY_SOURCE_RATE_HZ } from '../../constants';
import { Simulator } from './Simulator';
import { UpdateSubscriberEvent } from './simulator.worker.model';

describe('Simulator', () => {
    let simulator: Simulator;

    beforeEach(() => {
        simulator = new Simulator();
    });

    afterEach(() => {
        jasmine.clock().uninstall();
    });

    it('should create an instance', () => {
        expect(simulator).toBeTruthy();
    });

    describe('updateMission', () => {
        it('should update mission data', () => {
            spyOn<any>(simulator, '_updateMission').and.returnValue(Promise.resolve());

            simulator.updateMission('testMissionId');

            expect(simulator['_updateMissionPromise']).toBeTruthy();
        });
    });

    describe('startMission', () => {
        it('should start the mission if it is not complete', () => {
            spyOn<any>(simulator, '_startMission').and.callThrough();
            simulator['_isMissionComplete'] = false;

            simulator.startMission();

            expect(simulator['_startMission']).toHaveBeenCalled();
        });
    });

    describe('stopMission', () => {
        it('should stop the mission', () => {
            jasmine.clock().install();
            simulator['_isMissionRunning'] = true;
            simulator['_missionInterval'] = setInterval(() => void {}, 1000);

            simulator.stopMission();

            expect(simulator['_isMissionRunning']).toBeFalse();
            expect(simulator['_missionInterval']).toBeNull();
        });
    });

    describe('updateMissionPlaybackSpeed', () => {
        it('should update the playback speed and timestep', () => {
            const newSpeed = 5;

            simulator.updateMissionPlaybackSpeed(newSpeed);

            expect(simulator['_missionPlaybackSpeed']).toBe(newSpeed);
            expect(simulator['_timeStep']).toBe(1 / (TELEMETRY_SOURCE_RATE_HZ / newSpeed));
        });
    });

    describe('addSubscriber', () => {
        it('should add a subscriber to the queue', () => {
            simulator.addSubscriber({
                type: 'add-subscriber',
                id: 'testId',
                port: new MessageChannel().port1,
                hz: 5,
                missionDataProperties: ['altitude'],
            });

            expect(simulator['_addSubscriberEventQueue'].length).toBe(1);
        });
    });

    describe('updateSubscriber', () => {
        it('should update a subscriber if it exists', () => {
            const id = 'testId';

            simulator.addSubscriber({
                type: 'add-subscriber',
                id,
                hz: 5,
                missionDataProperties: [],
                port: new MessageChannel().port1,
            });

            // Drain the new subscriber queue manually.
            simulator['_drainAddSubscriberEventQueue']();

            const newHz = 10;
            simulator.updateSubscriber({
                type: 'update-subscriber',
                id,
                hz: newHz,
            } satisfies UpdateSubscriberEvent);

            expect(simulator['_subscribers'].get('testId')?.hz).toBe(newHz);
        });
    });
});
