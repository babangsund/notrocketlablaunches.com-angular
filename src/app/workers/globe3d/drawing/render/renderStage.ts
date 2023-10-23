import { mat4, vec3 } from 'gl-matrix';
import { type Stage } from '../create/createStage';
import { degreesToRadians } from '../utils/degreesToRadians';
import { latLonToCartesian } from '../utils/latLonToCartesian';

/**
 * Renders a rocket stage on the globe at the specified lat, lon, and altitude.
 *
 * @param gl WebGLRenderingContext.
 * @param modelViewMatrix The model-view matrix.
 * @param projectionMatrix The projection matrix.
 * @param lat Latitude value where the stage should be rendered.
 * @param lon Longitude value where the stage should be rendered.
 * @param alt Altitude value where the stage should be rendered.
 * @param stage An object containing the shader program, buffers, and texture for rendering the stage.
 */
export function renderStage(
    gl: WebGLRenderingContext,
    modelViewMatrix: mat4,
    projectionMatrix: mat4,
    lat: number,
    lon: number,
    alt: number,
    stage: Stage
): void {
    const { stageShader, stageBuffers, stageTexture } = stage;

    const shaderProgram = stageShader.program;

    gl.useProgram(shaderProgram);

    // Update the model-view matrix
    mat4.rotateY(modelViewMatrix, modelViewMatrix, degreesToRadians(180));
    mat4.translate(
        modelViewMatrix,
        modelViewMatrix,
        vec3.fromValues(...latLonToCartesian(lat, lon, convertAltitude(0, 251.2935717105856, alt)))
    );

    // Set shader uniforms and attributes
    const uModelViewMatrix = stageShader.uniformLocations.uModelViewMatrix;
    const uProjectionMatrix = stageShader.uniformLocations.uProjectionMatrix;
    // Matrices
    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);

    // Buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, stageBuffers.vertices);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, stageBuffers.indices);

    // Attributes
    const aVertexPosition = stageShader.attribLocations.vertexPosition;
    gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(aVertexPosition);

    const aTextureCoord = stageShader.attribLocations.textureCoord;
    gl.vertexAttribPointer(aTextureCoord, 2, gl.FLOAT, false, 20, 12);
    gl.enableVertexAttribArray(aTextureCoord);

    // Uniforms
    const uSampler = stageShader.uniformLocations.uSampler;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, stageTexture);
    gl.uniform1i(uSampler, 0);

    gl.disable(gl.DEPTH_TEST);
    // Draw
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    gl.enable(gl.DEPTH_TEST);
}

function convertAltitude(minAltitude: number, maxAltitude: number, altitude: number): number {
    // Step 2: Normalize the altitude to a range of 0 to 1
    const normalizedAltitude = (altitude - minAltitude) / (maxAltitude - minAltitude);

    // Step 3: Scale and shift the normalized value to the desired range of 1.03 to 1.1
    const scaledAltitude = 1 + normalizedAltitude * 0.15;

    return scaledAltitude;
}
