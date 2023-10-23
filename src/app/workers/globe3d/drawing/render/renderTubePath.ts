import { mat3, mat4, vec3 } from 'gl-matrix';
import { TubePath } from '../create/createTubePath';
import { type ShaderProgramWithLocations } from '../shader/createShaderProgram';
import { degreesToRadians } from '../utils/degreesToRadians';
import { latLonToCartesian } from '../utils/latLonToCartesian';

/**
 * Creates geometry and then renders a tube path.
 *
 * @param gl WebGLRenderingContext
 * @param projectionMatrix The projection matrix
 * @param modelViewMatrix The model-view matrix
 * @param path An array of path segments describing the tube path
 * @param minAltitude The minimum altitude value of the path
 * @param maxAltitude The maximum altitude value of the path
 * @param tubePath An object containing the shader program for rendering the tube path
 * @param alpha The alpha value for the tube path rendering. Defaults to '0.3'.
 */
export function renderTubePath(
    gl: WebGLRenderingContext,
    projectionMatrix: mat4,
    modelViewMatrix: mat4,
    path: PathSegment[],
    minAltitude: number,
    maxAltitude: number,
    tubePath: TubePath,
    alpha = '0.3'
): void {
    // 180deg offset because to account for texture alignment.
    mat4.rotateY(modelViewMatrix, modelViewMatrix, degreesToRadians(180));

    const pathAsVec3 = path.map(({ latitude, longitude, altitude }) => {
        return vec3.fromValues(
            ...latLonToCartesian(
                latitude,
                longitude,
                convertAltitude(minAltitude, maxAltitude, altitude)
            )
        );
    });

    // We use the alpha to determine whether to make the geometry of the tube slightly smaller,
    // because the flown path should cover the planned path.
    const tubeGeometry = generateTubeGeometry(pathAsVec3, alpha === '0.3' ? 0.003 : 0.004, 4);
    const tubeBuffers = createTubeBuffers(gl, tubeGeometry);

    gl.useProgram(tubePath.tubePathShader.program);
    renderTube(gl, tubeBuffers, tubePath.tubePathShader, projectionMatrix, modelViewMatrix);
}

export interface PathSegment {
    altitude: number;
    latitude: number;
    longitude: number;
}

/**
 * Converts the given altitude to a normalized and scaled altitude value.
 *
 * @param minAltitude The minimum altitude.
 * @param maxAltitude The maximum altitude.
 * @param altitude The altitude to be converted.
 * @returns The converted altitude value.
 */
function convertAltitude(minAltitude: number, maxAltitude: number, altitude: number): number {
    const normalizedAltitude = (altitude - minAltitude) / (maxAltitude - minAltitude);
    const scaledAltitude = 1 + normalizedAltitude * 0.15;
    return scaledAltitude;
}

interface TubeGeometry {
    vertices: Float32Array;
    normals: Float32Array;
    indices: Uint16Array;
}

/**
 * Generates the geometry for a tube based on the provided path, radius, and radial segments.
 *
 * @param path An array of vec3 positions describing the path of the tube.
 * @param radius The radius of the tube.
 * @param radialSegments The number of radial segments for the tube.
 * @returns `TubeGeometry`
 */
function generateTubeGeometry(path: vec3[], radius: number, radialSegments: number): TubeGeometry {
    const vertices = [];
    const normals = [];
    const indices = [];

    for (let i = 0; i < path.length; i++) {
        const position = path[i];
        const nextPosition = path[(i + 1) % path.length];
        const direction = vec3.create();
        vec3.subtract(direction, nextPosition, position);
        vec3.normalize(direction, direction);

        const up = vec3.fromValues(0, 1, 0);
        const right = vec3.create();
        vec3.cross(right, up, direction);

        for (let j = 0; j <= radialSegments; j++) {
            const theta = (j / radialSegments) * Math.PI * 2;
            const x = Math.cos(theta);
            const y = Math.sin(theta);

            const normal = vec3.create();
            vec3.set(
                normal,
                x * right[0] + y * up[0],
                x * right[1] + y * up[1],
                x * right[2] + y * up[2]
            );
            vec3.normalize(normal, normal);

            const vertex = vec3.create();
            vec3.set(
                vertex,
                position[0] + radius * normal[0],
                position[1] + radius * normal[1],
                position[2] + radius * normal[2]
            );

            vertices.push(vertex[0], vertex[1], vertex[2]);
            normals.push(normal[0], normal[1], normal[2]);
        }

        if (i < path.length - 1) {
            const offset = i * (radialSegments + 1);
            for (let j = 0; j < radialSegments; j++) {
                const a = offset + j;
                const b = offset + j + 1;
                const c = offset + j + radialSegments + 1;
                const d = offset + j + radialSegments + 2;

                indices.push(a, b, c);
                indices.push(b, c, d);
            }
        }
    }

    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        indices: new Uint16Array(indices),
    };
}

interface TubeBuffers {
    vertexBuffer: WebGLBuffer;
    normalBuffer: WebGLBuffer;
    indexBuffer: WebGLBuffer;
    indexCount: number;
}

/**
 * Creates buffers for the tube geometry.
 *
 * @param gl WebGLRenderingContext
 * @param geometry The tube geometry.
 * @returns `TubeBuffers`
 */
function createTubeBuffers(gl: WebGLRenderingContext, geometry: TubeGeometry): TubeBuffers {
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.normals, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);

    if (!vertexBuffer || !normalBuffer || !indexBuffer) {
        throw new Error('Failed to create tube buffers.');
    }

    return {
        vertexBuffer,
        normalBuffer,
        indexBuffer,
        indexCount: geometry.indices.length,
    };
}

/**
 * Renders the tube on using the provided buffers, shader program, and matrices.
 *
 * @param gl WebGLRenderingContext
 * @param tubeBuffers The buffers for rendering the tube.
 * @param shaderProgram The shader program with locations for rendering the tube.
 * @param projectionMatrix The projection matrix.
 * @param modelViewMatrix The model-view matrix.
 */
function renderTube(
    gl: WebGLRenderingContext,
    tubeBuffers: TubeBuffers,
    shaderProgram: ShaderProgramWithLocations,
    projectionMatrix: mat4,
    modelViewMatrix: mat4
): void {
    const normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, modelViewMatrix);

    gl.uniformMatrix3fv(shaderProgram.uniformLocations.uNormalMatrix, false, normalMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, tubeBuffers.vertexBuffer);
    gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shaderProgram.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, tubeBuffers.normalBuffer);
    gl.vertexAttribPointer(shaderProgram.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shaderProgram.attribLocations.vertexNormal);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tubeBuffers.indexBuffer);

    gl.uniformMatrix4fv(shaderProgram.uniformLocations.uProjectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(shaderProgram.uniformLocations.uModelViewMatrix, false, modelViewMatrix);

    gl.drawElements(gl.TRIANGLES, tubeBuffers.indexCount, gl.UNSIGNED_SHORT, 0);
}
