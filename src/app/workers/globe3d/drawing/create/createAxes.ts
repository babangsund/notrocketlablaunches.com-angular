import {
    createShaderProgram,
    type ShaderProgramWithLocations,
} from '../shader/createShaderProgram';

/**
 * Creates an object `Axes` containing the buffer, shader, and vertices for 3D axes.
 * See `renderAxes` for more information.
 *
 * @param gl WebGLRenderingContext
 * @returns `Axes`
 */
export function createAxes(gl: WebGLRenderingContext): Axes {
    const axesShader = createShaderProgram(gl, fsSource, vsSource);

    const axesBuffer = gl.createBuffer();
    if (!axesBuffer) {
        throw new Error('Failed to create axes buffer.');
    }

    return {
        axesShader,
        axesBuffer,
        axesVertices: AXES_VERTICES,
    };
}

export interface Axes {
    axesBuffer: WebGLBuffer;
    axesVertices: Float32Array;
    axesShader: ShaderProgramWithLocations;
}

const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    varying lowp vec4 vColor;
    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vColor = aVertexColor;
    }
`;

const fsSource = `
    varying lowp vec4 vColor;
    void main(void) {
        gl_FragColor = vColor;
    }
`;

const AXES_VERTICES: Readonly<Float32Array> = new Float32Array([
    //
    -2.0,
    0.0,
    0.0,
    1.0,
    0.0,
    0.0, // X axis: red
    2.0,
    0.0,
    0.0,
    1.0,
    0.0,
    0.0,
    //
    0.0,
    -2.0,
    0.0,
    0.0,
    1.0,
    0.0, // Y axis: green
    0.0,
    2.0,
    0.0,
    0.0,
    1.0,
    0.0,
    //
    0.0,
    0.0,
    -2.0,
    0.0,
    0.0,
    1.0, // Z axis: blue
    0.0,
    0.0,
    2.0,
    0.0,
    0.0,
    1.0,
    //
]);
