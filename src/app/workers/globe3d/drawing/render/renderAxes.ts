import { mat4 } from 'gl-matrix';
import { Axes } from '../create/createAxes';

/**
 * Renders 3D axes (x, y, z).
 * The axes can be helpful for understanding the orientation
 * and position of other objects in the same context.
 *
 * @param gl - WebGLRenderingContext in which the axes will be drawn.
 * @param axes - An object containing the buffer, shader, and vertices for the axes.
 * @param modelViewMatrix - The model-view matrix that represents the transformation to be applied to the vertices.
 * @param projectionMatrix - The projection matrix that defines the camera's viewing volume.
 */
export function renderAxes(
    gl: WebGLRenderingContext,
    axes: Axes,
    modelViewMatrix: mat4,
    projectionMatrix: mat4
): void {
    const { axesBuffer, axesShader, axesVertices } = axes;

    // Buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, axesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, axesVertices, gl.STATIC_DRAW);

    gl.useProgram(axesShader.program);

    // Attributes
    gl.vertexAttribPointer(axesShader.attribLocations.vertexPosition, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(axesShader.attribLocations.vertexPosition);

    gl.vertexAttribPointer(axesShader.attribLocations.vertexColor, 3, gl.FLOAT, false, 24, 12);
    gl.enableVertexAttribArray(axesShader.attribLocations.vertexColor);

    // Uniforms
    gl.uniformMatrix4fv(axesShader.uniformLocations.uModelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix4fv(axesShader.uniformLocations.uProjectionMatrix, false, projectionMatrix);

    // Draw
    gl.drawArrays(gl.LINES, 0, 6);
}
