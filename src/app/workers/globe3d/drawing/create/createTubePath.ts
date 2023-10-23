import {
    createShaderProgram,
    type ShaderProgramWithLocations,
} from '../shader/createShaderProgram';

/**
 * Creates a shader program for rendering tube paths with the given color and alpha values.
 *
 * @param gl WebGLRenderingContext.
 * @param color The RGB color values for the shader, provided as a comma-separated string.
 * @param alpha The alpha (transparency) value for the shader.
 * @returns The shader program with attribute and uniform locations.
 */
export function createTubePath(
    gl: WebGLRenderingContext,
    color = '0.61, 0.61, 0.61',
    alpha = '0.3'
): TubePath {
    return {
        tubePathShader: createShaderProgram(
            gl,
            fsSource.replace('0.61, 0.61, 0.61', color).replace('0.3', alpha),
            vsSource
        ),
    };
}

export interface TubePath {
    tubePathShader: ShaderProgramWithLocations;
}

const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat3 uNormalMatrix;
    varying highp vec3 vLighting;
    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        
        highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
        highp vec3 directionalLightColor = vec3(1, 1, 1);
        highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));
        highp vec4 transformedNormal = vec4(uNormalMatrix * aVertexNormal, 1.0);
        highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
        vLighting = ambientLight + (directionalLightColor * directional);
    }
`;

const fsSource = `
    varying highp vec3 vLighting;
    void main(void) {
        highp vec3 color = vec3(0.61, 0.61, 0.61);
        gl_FragColor = vec4(color * vLighting, 0.3);
    }
`;
