import { LineChart2d } from './LineChart2d';
import { PADDING_BOTTOM, PADDING_LEFT, PADDING_RIGHT, PADDING_TOP } from './constants';

describe('LineChart2d', () => {
    let lineChart2d: LineChart2d;

    beforeEach(() => {
        lineChart2d = new LineChart2d();
    });

    it('should create an instance', () => {
        expect(lineChart2d).toBeTruthy();
    });

    describe('start', () => {
        it('should initialize properties and set up the canvas context', () => {
            lineChart2d.start({
                type: 'start',
                dpr: 2,
                port: new MessageChannel().port1,
                unit: 'meters',
                colors: {},
                offscreenCanvas: new OffscreenCanvas(300, 150),
            });

            expect(lineChart2d['_dpr']).toBe(2);
            expect(lineChart2d['_unit']).toBe('meters');
            expect(lineChart2d['_ctx']).toBeTruthy();
        });
    });

    describe('resize', () => {
        it('should update the canvas dimensions', () => {
            lineChart2d['_offscreenCanvas'] = document
                .createElement('canvas')
                .transferControlToOffscreen();
            lineChart2d['_offscreenCanvas'].width = 10;
            lineChart2d['_offscreenCanvas'].height = 20;

            lineChart2d.resize({
                type: 'resize',
                width: 500,
                height: 250,
            });

            expect(lineChart2d['_offscreenCanvas']?.width).toBe(500);
            expect(lineChart2d['_offscreenCanvas']?.height).toBe(250);
        });
    });

    describe('_onPortMessage', () => {
        it('should update stored data with received data', () => {
            lineChart2d['_onPortMessage'](
                new MessageEvent('message', {
                    data: {
                        type: 'batched-data',
                        missionTimeSec: 120,
                        missionData: {
                            someDataKey: [100, 110, 120],
                        },
                    },
                })
            );

            expect(lineChart2d['_storedData']['someDataKey']).toEqual([100, 110, 120]);
        });

        describe('when context exists', () => {
            it('should request a new animation frame', () => {
                const spy = spyOn<any>(
                    lineChart2d,
                    '_cancelAndRequestAnimationFrame'
                ).and.callThrough();
                lineChart2d['_ctx'] = document
                    .createElement('canvas')
                    .transferControlToOffscreen()
                    .getContext('2d');

                lineChart2d['_onPortMessage'](
                    new MessageEvent('message', {
                        data: {
                            type: 'batched-data',
                            missionTimeSec: 120,
                            missionData: {
                                altitude: [100, 110, 120],
                            },
                        },
                    })
                );

                expect(spy).toHaveBeenCalled();
            });
        });
        describe('when there is no context', () => {
            it('should skip rendering', () => {
                const spy = spyOn<any>(
                    lineChart2d,
                    '_cancelAndRequestAnimationFrame'
                ).and.callThrough();

                lineChart2d['_onPortMessage'](
                    new MessageEvent('message', {
                        data: {
                            type: 'batched-data',
                            missionTimeSec: 120,
                            missionData: {
                                altitude: [100, 110, 120],
                            },
                        },
                    })
                );

                expect(spy).not.toHaveBeenCalled();
            });
        });
    });

    describe('_computeMinMaxValues', () => {
        it('should compute min and max X and Y values', () => {
            const result = lineChart2d['_computeMinMaxValues'](
                {
                    // Odd entries are x values
                    altitude: [1, 110, 2, 95, 3, 92],
                },
                150
            );

            // X values should be the same in result and on class
            expect(result.minX).toBe(1);
            expect(result.maxX).toBe(3);
            expect(lineChart2d['_minX']).toBe(1);
            expect(lineChart2d['_maxX']).toBe(3);

            // Returns pretty Y values
            expect(result.minY).toBe(90);
            expect(result.maxY).toBe(110);
            // Sets raw values on the class
            expect(lineChart2d['_minY']).toBe(92);
            expect(lineChart2d['_maxY']).toBe(110);
        });
    });

    describe('_updateScaleAndDimensions', () => {
        it('should update the canvas scale and adjust canvas dimensions', () => {
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 150;
            const ctx = canvas
                .transferControlToOffscreen()
                .getContext('2d') as OffscreenCanvasRenderingContext2D;
            const scaleSpy = spyOn(ctx, 'scale').and.callThrough();

            lineChart2d['_ctx'] = ctx;

            lineChart2d['_updateScaleAndDimensions']();

            expect(scaleSpy).toHaveBeenCalledWith(1, 1);
            expect(lineChart2d['_canvasWidth']).toBe(
                300 - lineChart2d['_dpr'] * (PADDING_LEFT + PADDING_RIGHT)
            );
            expect(lineChart2d['_canvasHeight']).toBe(
                150 - lineChart2d['_dpr'] * (PADDING_TOP + PADDING_BOTTOM)
            );
        });
    });

    describe('_cancelAndRequestAnimationFrame', () => {
        it('should cancel any pending animation frame and request a new one', () => {
            const mockFn = jasmine.createSpy('animationFunction');
            spyOn(window, 'cancelAnimationFrame');
            spyOn(window, 'requestAnimationFrame').and.returnValue(123);

            lineChart2d['_cancelAndRequestAnimationFrame'](mockFn);

            expect(mockFn).not.toHaveBeenCalled(); // It's an animation frame, so it shouldn't be called immediately.
            expect(window.requestAnimationFrame).toHaveBeenCalledWith(mockFn);
            expect(lineChart2d['_frame']).toBe(123);
        });
    });
});
