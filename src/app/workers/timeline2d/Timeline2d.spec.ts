import { MissionEvents } from 'src/app/data/data.model';
import { Timeline2d } from './Timeline2d';

describe('Timeline2d', () => {
    let timeline2d: Timeline2d;
    const mockMissionEvents: MissionEvents = [
        { title: 'Event 1', timeFromLaunchSec: 10 },
        { title: 'Event 2', timeFromLaunchSec: 520 },
    ];

    beforeEach(() => {
        timeline2d = new Timeline2d();
    });

    it('should create an instance', () => {
        expect(timeline2d).toBeTruthy();
    });

    it('should update FPS', () => {
        expect(timeline2d['_fps']).toBe(0);
        timeline2d.updateFps(60);
        expect(timeline2d['_fps']).toBe(60);
    });

    describe('start', () => {
        it('should initiate the timeline visualization', () => {
            const offscreenCanvas = new OffscreenCanvas(300, 150);
            timeline2d.start({
                type: 'start',
                dpr: 1,
                port: new MessageChannel().port1,
                offscreenCanvas,
                colors: {},
                unit: 'testUnit',
            });

            expect(timeline2d['_dpr']).toBe(1);
            expect(timeline2d['_ctx']).toBeTruthy();
            expect(timeline2d['_offscreenCanvas']).toBe(offscreenCanvas);
        });
    });

    describe('resize', () => {
        it('should handle the resizing of the timeline', () => {
            const spy = spyOn<any>(timeline2d, '_updateScaleAndDimensions').and.callThrough();
            timeline2d['_offscreenCanvas'] = new OffscreenCanvas(200, 100);

            expect(timeline2d['_offscreenCanvas'].width).toBe(200);
            expect(timeline2d['_offscreenCanvas'].height).toBe(100);

            timeline2d.resize({
                type: 'resize',
                width: 300,
                height: 150,
            });

            expect(spy).toHaveBeenCalledTimes(1);
            expect(timeline2d['_offscreenCanvas'].width).toBe(300);
            expect(timeline2d['_offscreenCanvas'].height).toBe(150);
        });
    });

    describe('_onPortMessage', () => {
        it('should handle messages received on the port', () => {
            timeline2d['_onPortMessage'](
                // https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent/MessageEvent
                new MessageEvent('message', {
                    data: {
                        type: 'batched-data',
                        missionTimeSec: 120,
                        missionData: {
                            someDataKey: [1, 2, 3],
                        },
                    },
                })
            );

            expect(timeline2d['_missionTimeSec']).toBe(120);
            expect(timeline2d['_storedData']['someDataKey']).toEqual([1, 2, 3]);
        });
    });

    describe('_getMissionEventSegments', () => {
        it('should segment mission events based on the threshold', () => {
            const segments = timeline2d['_getMissionEventSegments'](mockMissionEvents);

            expect(segments.length).toBe(2);
            expect(segments[0].missionEvents).toEqual([mockMissionEvents[0]]);
            expect(segments[1].missionEvents).toEqual([mockMissionEvents[1]]);
        });
    });

    describe('_formatDuration', () => {
        it('should format seconds into HH:MM:SS', () => {
            expect(timeline2d['_formatDuration'](3661)).toBe('01:01:01');
            expect(timeline2d['_formatDuration'](0)).toBe('00:00:00');
            expect(timeline2d['_formatDuration'](60)).toBe('00:01:00');
        });
    });
});
