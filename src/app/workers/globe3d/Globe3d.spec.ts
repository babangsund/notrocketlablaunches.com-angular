import { Globe3d } from './Globe3d';
import {
    GLOBE_3D_DEFAULT_ZOOM,
    GLOBE_3D_MAX_ZOOM,
    GLOBE_3D_MIN_ZOOM,
    GLOBE_3D_ZOOM_INCREMENT,
    GLOBE_3D_ZOOM_WHEEL_INCREMENT,
} from './constants';

describe('Globe3d', () => {
    let globe3d: Globe3d;

    beforeEach(() => {
        globe3d = new Globe3d();
    });

    it('should create an instance', () => {
        expect(globe3d).toBeTruthy();
    });

    describe('start', () => {
        it('should initialize properties and set up WebGL rendering', async () => {
            const offscreenCanvas = new OffscreenCanvas(300, 150);

            await globe3d.start({
                type: 'start',
                dpr: 1,
                offscreenCanvas,
                port: new MessageChannel().port1,
            });

            expect(globe3d['_offscreenCanvas']).toBe(offscreenCanvas);
            expect(globe3d['_gl']).toBeTruthy();
            expect(globe3d['_renderArtifacts'].sphere).toBeTruthy();
            expect(globe3d['_renderArtifacts'].stage1).toBeTruthy();
            expect(globe3d['_renderArtifacts'].stage2).toBeTruthy();
        });
    });

    describe('resize', () => {
        it('should update the canvas dimensions', () => {
            globe3d['_offscreenCanvas'] = new OffscreenCanvas(10, 20);
            globe3d.resize({ type: 'resize', width: 500, height: 250 });

            expect(globe3d['_offscreenCanvas']?.width).toBe(500);
            expect(globe3d['_offscreenCanvas']?.height).toBe(250);
        });
    });

    describe('zoomIn', () => {
        describe('click', () => {
            it('should increase the zoom level', () => {
                globe3d['_zoom'] = GLOBE_3D_DEFAULT_ZOOM + GLOBE_3D_ZOOM_INCREMENT;
                globe3d.zoomIn({ type: 'zoom-in', wheel: false });

                expect(globe3d['_zoom']).toBe(GLOBE_3D_DEFAULT_ZOOM);
            });

            it('should not exceed the max zoom level', () => {
                globe3d['_zoom'] = GLOBE_3D_MAX_ZOOM;
                globe3d.zoomIn({ type: 'zoom-in', wheel: false });

                expect(globe3d['_zoom']).toBe(GLOBE_3D_MAX_ZOOM);
            });
        });

        describe('wheel', () => {
            it('should increase the zoom level', () => {
                globe3d['_zoom'] = GLOBE_3D_DEFAULT_ZOOM + GLOBE_3D_ZOOM_WHEEL_INCREMENT;
                globe3d.zoomIn({ type: 'zoom-in', wheel: true, delta: 1 });

                expect(globe3d['_zoom']).toBe(GLOBE_3D_DEFAULT_ZOOM);
            });

            it('should not exceed the max zoom level', () => {
                globe3d['_zoom'] = GLOBE_3D_MAX_ZOOM;
                globe3d.zoomIn({ type: 'zoom-in', wheel: true, delta: 1 });

                expect(globe3d['_zoom']).toBe(GLOBE_3D_MAX_ZOOM);
            });
        });
    });

    describe('zoomOut', () => {
        describe('click', () => {
            it('should decrease the zoom level', () => {
                globe3d['_zoom'] = GLOBE_3D_DEFAULT_ZOOM;
                globe3d.zoomOut({ type: 'zoom-out', wheel: false });

                expect(globe3d['_zoom']).toBe(GLOBE_3D_DEFAULT_ZOOM - GLOBE_3D_ZOOM_INCREMENT);
            });

            it('should not go below the min zoom level', () => {
                globe3d['_zoom'] = GLOBE_3D_MIN_ZOOM;
                globe3d.zoomOut({ type: 'zoom-out', wheel: false });

                expect(globe3d['_zoom']).toBe(GLOBE_3D_MIN_ZOOM);
            });
        });

        describe('wheel', () => {
            it('should decrease the zoom level', () => {
                globe3d['_zoom'] = GLOBE_3D_DEFAULT_ZOOM;
                globe3d.zoomOut({ type: 'zoom-out', wheel: true, delta: 1 });

                expect(globe3d['_zoom']).toBe(
                    GLOBE_3D_DEFAULT_ZOOM - GLOBE_3D_ZOOM_WHEEL_INCREMENT
                );
            });

            it('should not go below the min zoom level', () => {
                globe3d['_zoom'] = GLOBE_3D_MIN_ZOOM;
                globe3d.zoomOut({ type: 'zoom-out', wheel: false });

                expect(globe3d['_zoom']).toBe(GLOBE_3D_MIN_ZOOM);
            });
        });
    });

    describe('_onPortMessage', () => {
        it('should update stored data with received data', () => {
            globe3d['_onPortMessage'](
                new MessageEvent('message', {
                    data: {
                        type: 'batched-data',
                        missionTimeSec: 120,
                        missionData: {
                            S1Altitude: [100, 110, 120],
                        },
                    },
                })
            );

            console.log(globe3d['_storedData']);

            expect(globe3d['_storedData']['S1Altitude']).toEqual([100, 110, 120]);
        });
    });

    describe('_createPathFromTelemetry', () => {
        it('should create a path from telemetry data', () => {
            const altitudeSeries = [10, 20, 30];
            const latitudeSeries = [40, 50, 60];
            const longitudeSeries = [70, 80, 90];

            const path = globe3d['_createPathFromTelemetry'](
                altitudeSeries,
                latitudeSeries,
                longitudeSeries
            );

            expect(path).toEqual([{ altitude: 20, latitude: 50, longitude: 80 }]);
        });
    });

    describe('_decimateBy50', () => {
        it('should decimate an array of data by a factor of 50', () => {
            const batch = Array.from({ length: 100 }, (_, i) => i + 1);
            const results = globe3d['_decimateBy50'](batch);

            expect(results).toEqual([99, 100]);
        });
    });
});
