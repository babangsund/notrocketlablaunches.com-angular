import {
    createShaderProgram,
    type ShaderProgramWithLocations,
} from '../shader/createShaderProgram';
import { loadTexture } from '../utils/loadTexture';

/**
 * Creates a sphere of a given radius.
 *
 * @param gl WebGLRenderingContext
 * @param radius Radius of the sphere
 * @param segments Number of segments. Less segments performs better but looks more jagged.
 * @returns `Sphere`
 */
export async function createSphere(
    gl: WebGLRenderingContext,
    radius: number,
    segments: number
): Promise<Sphere> {
    const sphereTexture = await loadTexture(gl, '/assets/images/3d/earth-high-res.png');
    const sphereShader = createShaderProgram(gl, fsSource, vsSource);

    const vertices = [];
    const indices = [];
    const texCoords = [];
    const normals = [];

    for (let y = 0; y <= segments; y++) {
        const theta = (y * Math.PI) / segments;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let x = 0; x <= segments; x++) {
            const phi = (x * 2 * Math.PI) / segments;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            const xCoord = cosPhi * sinTheta;
            const yCoord = cosTheta;
            const zCoord = sinPhi * sinTheta;

            const u = 1 - x / segments;
            const v = 1 - y / segments;

            vertices.push(radius * xCoord, radius * yCoord, radius * zCoord);
            texCoords.push(u, v);
            normals.push(xCoord, yCoord, zCoord);
        }
    }

    for (let y = 0; y < segments; y++) {
        for (let x = 0; x < segments; x++) {
            const first = y * (segments + 1) + x;
            const second = first + segments + 1;
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    const sphereData = {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
    };

    const sphereBuffers = {
        vertices: gl.createBuffer(),
        indices: gl.createBuffer(),
        normals: gl.createBuffer(),
        textureCoords: gl.createBuffer(),
    };

    // vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, sphereData.vertices, gl.STATIC_DRAW);

    // indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphereData.indices, gl.STATIC_DRAW);

    // texcoords
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.textureCoords);
    gl.bufferData(gl.ARRAY_BUFFER, sphereData.texCoords, gl.STATIC_DRAW);

    // normals
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.normals);
    gl.bufferData(gl.ARRAY_BUFFER, sphereData.normals, gl.STATIC_DRAW);

    return {
        sphereData,
        sphereShader,
        sphereBuffers,
        sphereTexture,
    };
}

export interface Sphere {
    sphereData: SphereData;
    sphereTexture: WebGLTexture;
    sphereBuffers: SphereBuffers;
    sphereShader: ShaderProgramWithLocations;
}

interface SphereData {
    vertices: Float32Array;
    indices: Uint16Array;
    texCoords: Float32Array;
}

interface SphereBuffers {
    vertices: WebGLBuffer | null;
    indices: WebGLBuffer | null;
    normals: WebGLBuffer | null;
    textureCoords: WebGLBuffer | null;
}

const fsSource = `
            varying highp vec2 vTextureCoord;
            varying highp float vLighting;
            uniform sampler2D uSampler;
            uniform highp float uAmbientLightIntensity;
            void main(void) {
                highp float ambient = uAmbientLightIntensity;
                highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
                gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
            }

            `;

const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec2 aTextureCoord;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform vec3 uLightDirection;
    varying highp vec2 vTextureCoord;
    varying highp float vLighting;
    uniform float uAmbientLightIntensity;
    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vTextureCoord = aTextureCoord;
        // Compute lighting factor
        highp vec3 lightDirectionNormalized = normalize(uLightDirection);
        highp vec3 transformedNormal = normalize(mat3(uModelViewMatrix) * aVertexNormal);
        highp float dotProduct = max(dot(transformedNormal, lightDirectionNormalized), 0.0);
        dotProduct = dotProduct * 2.0;
        vLighting = uAmbientLightIntensity + smoothstep(0.0, 1.0, dotProduct) * 2.0;
    }
`;
