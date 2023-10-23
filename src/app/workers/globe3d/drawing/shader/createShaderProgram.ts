/**
 * Creates a shader program with shader location getters.
 *
 * @param gl WebGLRenderingContext
 * @param fsSource Fragment shader source
 * @param vsSource Vertex shader source
 * @returns ShaderProgramWithLocations
 */
export function createShaderProgram(
    gl: WebGLRenderingContext,
    fsSource: FragmentShaderSource,
    vsSource: VertexShaderSource
): ShaderProgramWithLocations {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    if (!shaderProgram) {
        throw new Error('Failed to create shader program');
    }

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        throw new Error(
            'Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram)
        );
    }

    return {
        program: shaderProgram,
        attribLocations: {
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
        },
        uniformLocations: {
            uProjectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            uModelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            uNormalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
            uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
            uLightDirection: gl.getUniformLocation(shaderProgram, 'uLightDirection'),
        },
    };
}

export interface ShaderProgramWithLocations {
    program: WebGLProgram;
    attribLocations: {
        vertexColor: number;
        vertexNormal: number;
        vertexPosition: number;
        textureCoord: number;
    };
    uniformLocations: {
        uProjectionMatrix: WebGLUniformLocation | null;
        uModelViewMatrix: WebGLUniformLocation | null;
        uNormalMatrix: WebGLUniformLocation | null;
        uLightDirection: WebGLUniformLocation | null;
        uSampler: WebGLUniformLocation | null;
    };
}

type VertexShaderSource = string;
type FragmentShaderSource = string;

function loadShader(
    gl: WebGLRenderingContext,
    type: number,
    source: VertexShaderSource | FragmentShaderSource
): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
        throw new Error('Failed to create shader');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const shaderLog = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error('An error occurred compiling the shaders: ' + shaderLog);
    }

    return shader;
}
