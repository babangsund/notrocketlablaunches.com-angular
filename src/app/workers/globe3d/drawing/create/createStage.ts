import {
    createShaderProgram,
    type ShaderProgramWithLocations,
} from '../shader/createShaderProgram';
import { loadTexture } from '../utils/loadTexture';

/**
 * Creates a rocket stage.
 *
 * @param gl WebGLRenderingContext
 * @param stage Stage number
 * @returns `Stage`
 */
export async function createStage(gl: WebGLRenderingContext, stage: 1 | 2): Promise<Stage> {
    const stageTexture = await loadTexture(
        gl,
        stage === 1 ? '/assets/images/3d/stage-1.png' : '/assets/images/3d/stage-2.png',
        1,
        1
    );
    const stageShader = createShaderProgram(gl, fsSource, vsSource);

    const sizeMultiplier = 0.05;
    const vertices = new Float32Array([
        2.0 * sizeMultiplier,
        0.5 * sizeMultiplier,
        0.0,
        1.0,
        1.0, // Top Right
        2.0 * sizeMultiplier,
        -0.5 * sizeMultiplier,
        0.0,
        1.0,
        0.0, // Bottom Right
        -2.0 * sizeMultiplier,
        -0.5 * sizeMultiplier,
        0.0,
        0.0,
        0.0, // Bottom Left
        -2.0 * sizeMultiplier,
        0.5 * sizeMultiplier,
        0.0,
        0.0,
        1.0, // Top Left
    ]);
    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        throw new Error('Failed to create vertex buffer for stage.');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const indices = new Uint16Array([
        // First triangle
        0, 1, 2,
        // Second triangle
        2, 3, 0,
    ]);
    const indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
        throw new Error('Failed to create index buffer for stage.');
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    const stageData = {
        indices,
        vertices,
    };

    const stageBuffers = {
        indices: indexBuffer,
        vertices: vertexBuffer,
    };

    return {
        stageData,
        stageShader,
        stageTexture,
        stageBuffers,
    };
}

export interface Stage {
    stageTexture: WebGLTexture;
    stageShader: ShaderProgramWithLocations;
    stageData: {
        indices: Uint16Array;
        vertices: Float32Array;
    };
    stageBuffers: {
        indices: WebGLBuffer;
        vertices: WebGLBuffer;
    };
}

const fsSource = `
  varying highp vec2 vTextureCoord;
  uniform sampler2D uSampler;
  void main(void) {
    gl_FragColor = texture2D(uSampler, vTextureCoord);
  }
`;

// Uses billboarding to make the stage always face the camera
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec2 aTextureCoord;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying highp vec2 vTextureCoord;

    void main(void) {
        // 1. Extract the translation from the model-view matrix
        vec4 translation = vec4(uModelViewMatrix[3].xyz, 1.0);
        
        // 2. Construct a new model-view matrix with no rotation
        mat4 billboardModelViewMatrix = mat4(
            vec4(1.0, 0.0, 0.0, 0.0),
            vec4(0.0, 1.0, 0.0, 0.0),
            vec4(0.0, 0.0, 1.0, 0.0),
            translation
        );
        
        gl_Position = uProjectionMatrix * billboardModelViewMatrix * aVertexPosition;
        vTextureCoord = aTextureCoord;
    }
`;
