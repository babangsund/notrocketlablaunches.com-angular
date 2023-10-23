import { mat4 } from 'gl-matrix';
import { MissionDataProperty } from 'src/app/data/data.model';
import { FromSimulatorToSubscriberEvent } from '../simulator/simulator.worker.model';
import { BatchedData } from '../worker.model';
import {
    GLOBE_3D_DEFAULT_LAT,
    GLOBE_3D_DEFAULT_LON,
    GLOBE_3D_DEFAULT_ZOOM,
    GLOBE_3D_MAX_ZOOM,
    GLOBE_3D_MIN_ZOOM,
    GLOBE_3D_ZOOM_INCREMENT,
    GLOBE_3D_ZOOM_WHEEL_INCREMENT,
} from './constants';
import { Sphere, createSphere } from './drawing/create/createSphere';
import { Stage, createStage } from './drawing/create/createStage';
import { TubePath, createTubePath } from './drawing/create/createTubePath';
import { renderSphere } from './drawing/render/renderSphere';
import { renderStage } from './drawing/render/renderStage';
import { PathSegment, renderTubePath } from './drawing/render/renderTubePath';
import { hexToRGB } from './drawing/utils/hexToRGB';
import { positionCamera } from './drawing/utils/positionCamera';
import { ResizeEvent, StartEvent, ZoomInEvent, ZoomOutEvent } from './globe3d.worker.model';

export class Globe3d {
    /**
     * All data this class has received in its lifetime.
     * We assume all data is received in chronological order and without duplicates.
     * (Something we could handle in our streaming platform, e.g. Kafka)
     *
     * @private
     */
    private readonly _storedData: BatchedData = {};
    /**
     * Canvas for rendering the 3D globe.
     *
     * @private
     */
    private _offscreenCanvas: OffscreenCanvas | null = null;
    /**
     * ID of the current animation frame.
     *
     * @private
     */
    private _frame: number | null = null;
    /**
     * Canvas WebGL rendering context.
     *
     * @private
     */
    private _gl: WebGLRenderingContext | null = null;
    /**
     * Actual canvas width.
     *
     * @private
     */
    private _canvasWidth = 0;
    /**
     * Actual canvas height.
     *
     * @private
     */
    private _canvasHeight = 0;
    /**
     * Current zoom level of the 3D globe.
     *
     * @private
     */
    private _zoom = GLOBE_3D_DEFAULT_ZOOM;
    /**
     * Contains all the necessary rendering artifacts like sphere, stages, and shaders.
     *
     * @private
     */
    private _renderArtifacts: {
        sphere: Sphere | null;
        stage1: Stage | null;
        stage2: Stage | null;
        flownTubePath: TubePath | null;
        plannedTubePath: TubePath | null;
    } = {
        sphere: null,
        stage1: null,
        stage2: null,
        flownTubePath: null,
        plannedTubePath: null,
    };
    /**
     * Initializes the Globe3D class and sets up WebGL rendering.
     *
     * @param evt The event object.
     * @param evt.port Message port for communication.
     * @param evt.offscreenCanvas Canvas for rendering the line chart.
     */
    public async start({ port, offscreenCanvas }: StartEvent): Promise<void> {
        this._offscreenCanvas = offscreenCanvas;
        this._gl = offscreenCanvas.getContext('webgl', { antialias: true });
        const gl = this._gl;
        if (!gl) return;

        this._updateViewportAndDimensions();

        const [sphere, stage1, stage2] = await Promise.all([
            createSphere(gl, 1, 64),
            createStage(gl, 1),
            createStage(gl, 2),
        ]);

        this._renderArtifacts = {
            sphere,
            stage1,
            stage2,
            plannedTubePath: createTubePath(gl),
            flownTubePath: createTubePath(gl, '0.8, 0.15, 0.15', '1.0'),
        };

        port.onmessage = this._onPortMessage.bind(this);

        this._cancelAndRequestAnimationFrame(this._render);
    }
    /**
     * Handles resizing of the canvas.
     *
     * @param evt The event object.
     * @param evt.width Width of the canvas
     * @param evt.height Height of the canvas
     */
    public resize(evt: ResizeEvent): void {
        if (this._offscreenCanvas) {
            this._offscreenCanvas.width = evt.width;
            this._offscreenCanvas.height = evt.height;
            this._gl = this._offscreenCanvas?.getContext('webgl', { antialias: true });
            const gl = this._gl;
            if (!gl) return;
            this._updateViewportAndDimensions();
        }
    }
    /**
     * Zooms in on the 3D globe.
     *
     * @param evt The event object.
     * @param evt.wheel Indicates if zooming is initiated by mouse wheel.
     * @param evt.delta Zoom wheel increment factor.
     */
    public zoomIn({ wheel, delta = 0 }: ZoomInEvent): void {
        this._zoom = Math.min(GLOBE_3D_MAX_ZOOM, this._zoom + this._getZoomIncrement(wheel, delta));
        this._cancelAndRequestAnimationFrame(this._render);
    }
    /**
     * Zooms out on the 3D globe.
     *
     * @param evt The event object.
     * @param evt.wheel Indicates if zooming is initiated by mouse wheel.
     * @param evt.delta Zoom wheel increment factor.
     */
    public zoomOut({ wheel, delta = 0 }: ZoomOutEvent): void {
        this._zoom = Math.max(GLOBE_3D_MIN_ZOOM, this._zoom - this._getZoomIncrement(wheel, delta));
        this._cancelAndRequestAnimationFrame(this._render);
    }
    /**
     * Computes the zoom increment based on wheel input and delta.
     *
     * @param evt The event object.
     * @param wheel Indicates if zooming is initiated by mouse wheel.
     * @param delta Zoom increment or decrement factor.
     * @returns Computed zoom increment.
     * @private
     */
    private _getZoomIncrement(wheel: boolean, delta: number): number {
        return wheel ? GLOBE_3D_ZOOM_WHEEL_INCREMENT * delta : GLOBE_3D_ZOOM_INCREMENT;
    }
    /**
     * Updates the canvas's viewport and dimensions.
     *
     * @private
     */
    private _updateViewportAndDimensions(): void {
        const gl = this._gl;
        if (!gl) return;

        this._canvasWidth = gl.canvas.width;
        this._canvasHeight = gl.canvas.height;

        gl?.viewport(0, 0, this._canvasWidth, this._canvasHeight);
    }

    /**
     * Handles messages received on the port and updates the globe with new data.
     *
     * @param evt Message event containing data for the globe.
     */
    private _onPortMessage(evt: MessageEvent<FromSimulatorToSubscriberEvent>): void {
        const { _gl: gl } = this;
        if (gl) {
            Object.entries(evt.data.missionData).forEach(([key, data]) => {
                if (!data) return;

                const telemetryKey = key as MissionDataProperty;
                if (!this._storedData[telemetryKey]) this._storedData[telemetryKey] = [];

                if (['S2Altitude', 'S2Latitude', 'S2Longitude'].includes(telemetryKey)) {
                    this._storedData[telemetryKey]?.push(...data);
                } else {
                    this._storedData[telemetryKey]?.push(...data);
                }
            });

            this._cancelAndRequestAnimationFrame(this._render);
        }
    }
    /**
     * Main rendering function for the 3D globe and its data.
     *
     * @private
     */
    private readonly _render = (): void => {
        const {
            _gl: gl,
            _zoom: zoom,
            _storedData: storedData,
            _canvasWidth: width,
            _canvasHeight: height,
            _renderArtifacts: { sphere, stage1, stage2, flownTubePath, plannedTubePath },
        } = this;

        if (!gl || !sphere || !stage1 || !stage2 || !flownTubePath || !plannedTubePath) {
            return;
        }

        const [r, g, b] = hexToRGB('#171717');
        gl.clearColor(r, g, b, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        gl.getExtension('OES_texture_float');
        gl.getExtension('OES_texture_float_linear');

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const fovDegrees = 45;
        const fieldOfView = (fovDegrees * Math.PI) / 180;
        const aspect = width / height;
        const zNear = 0.1;
        const zFar = 100.0;

        // Set up the view.
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
        const modelViewMatrix = mat4.create();

        const {
            S1Altitude,
            S1Latitude,
            S1Longitude,
            S1PlannedAltitude,
            S1PlannedLatitude,
            S1PlannedLongitude,
            S2Altitude,
            S2Latitude,
            S2Longitude,
            S2PlannedAltitude,
            S2PlannedLatitude,
            S2PlannedLongitude,
        } = storedData;

        const s2Lat = S2Latitude?.[S2Latitude.length - 1] ?? GLOBE_3D_DEFAULT_LAT;
        const s2Lon = S2Longitude?.[S2Longitude.length - 1] ?? GLOBE_3D_DEFAULT_LON;

        positionCamera(modelViewMatrix, zoom, s2Lat, s2Lon);

        // Create a new matrix to hold the original state
        const originalModelViewMatrix = mat4.create();
        // Save the original state of the modelViewMatrix
        mat4.copy(originalModelViewMatrix, modelViewMatrix);

        function restoreViewState(): void {
            // Restore the original state of the modelViewMatrix
            mat4.copy(modelViewMatrix, originalModelViewMatrix);
        }

        renderSphere(gl, sphere, projectionMatrix, modelViewMatrix);
        restoreViewState();

        const minAltitude = Math.min(...(S1PlannedAltitude ?? []), ...(S2PlannedAltitude ?? []));
        const maxAltitude = Math.max(...(S1PlannedAltitude ?? []), ...(S2PlannedAltitude ?? []));

        // S1 Planned path
        renderTubePath(
            gl,
            projectionMatrix,
            modelViewMatrix,
            this._createPathFromTelemetry(
                S1PlannedAltitude ?? [],
                S1PlannedLatitude ?? [],
                S1PlannedLongitude ?? []
            ),
            minAltitude,
            maxAltitude,
            plannedTubePath
        );
        restoreViewState();

        // S1 Flown path
        renderTubePath(
            gl,
            projectionMatrix,
            modelViewMatrix,
            this._createPathFromTelemetry(S1Altitude ?? [], S1Latitude ?? [], S1Longitude ?? []),
            minAltitude,
            maxAltitude,
            flownTubePath,
            '1.0' // alpha
        );
        restoreViewState();

        // S2 Planned path
        renderTubePath(
            gl,
            projectionMatrix,
            modelViewMatrix,
            this._createPathFromTelemetry(
                S2PlannedAltitude ?? [],
                S2PlannedLatitude ?? [],
                S2PlannedLongitude ?? []
            ),
            minAltitude,
            maxAltitude,
            plannedTubePath
        );
        restoreViewState();

        // S2 Flown path
        renderTubePath(
            gl,
            projectionMatrix,
            modelViewMatrix,
            this._createPathFromTelemetry(
                this._decimateBy50(S2Altitude ?? []),
                this._decimateBy50(S2Latitude ?? []),
                this._decimateBy50(S2Longitude ?? [])
            ),
            minAltitude,
            maxAltitude,
            flownTubePath,
            '1.0' // alpha
        );
        restoreViewState();

        const s1Alt = S1Altitude?.[S1Altitude.length - 1] ?? 0;
        const s1Lat = S1Latitude?.[S1Latitude.length - 1] ?? 0;
        const s1Lon = S1Longitude?.[S1Longitude.length - 1] ?? 0;
        // Stage 1
        renderStage(gl, modelViewMatrix, projectionMatrix, s1Lat, s1Lon, s1Alt, stage1);
        restoreViewState();

        const s2Alt = S2Altitude?.[S2Altitude.length - 1] ?? 0;
        // Stage 2
        renderStage(gl, modelViewMatrix, projectionMatrix, s2Lat, s2Lon, s2Alt, stage2);
        restoreViewState();

        // Useful for debugging in 3d space.
        // renderAxes(gl, axes, modelViewMatrix, projectionMatrix);
        // restoreViewState();
    };
    /**
     * Cancels any pending animation frames and requests a new animation frame.
     *
     * @param draw Function to be called on the next animation frame.
     * @private
     */
    private _cancelAndRequestAnimationFrame(draw: VoidFunction): void {
        if (this._frame) {
            cancelAnimationFrame(this._frame);
        }
        this._frame = requestAnimationFrame(draw);
    }
    /**
     * Creates a path from telemetry data.
     *
     * @param altitudeSeries Series of altitude data.
     * @param latitudeSeries Series of latitude data.
     * @param longitudeSeries Series of longitude data.
     * @returns Array of path segments.
     * @private
     */
    private _createPathFromTelemetry(
        altitudeSeries: number[],
        latitudeSeries: number[],
        longitudeSeries: number[]
    ): PathSegment[] {
        const path = [];

        for (let idx = 1; idx < (altitudeSeries?.length ?? 0); idx += 2) {
            const altitude = altitudeSeries?.[idx];
            const latitude = latitudeSeries?.[idx];
            const longitude = longitudeSeries?.[idx];
            if (altitude && latitude && longitude) {
                path.push({
                    altitude,
                    latitude,
                    longitude,
                });
            }
        }

        return path;
    }
    /**
     * Decimates an array of data by a factor of 50.
     *
     * @param batch Array of data points.
     * @returns Filtered array of data points.
     * @private
     */
    private _decimateBy50(batch: number[]): number[] {
        const results: number[] = [];
        let totalPairsProcessed = 0;

        for (let i = 0; i < batch.length; i += 2) {
            if (i + 1 < batch.length) {
                // Ensure there's a pair
                totalPairsProcessed += 1;

                if (totalPairsProcessed % 50 === 0) {
                    // Process every 10th pair
                    results.push(batch[i], batch[i + 1]);
                }
            }
        }

        return results;
    }
}
