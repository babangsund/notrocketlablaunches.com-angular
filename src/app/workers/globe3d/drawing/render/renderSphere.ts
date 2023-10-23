import { mat3, mat4, vec3 } from 'gl-matrix';
import { type Sphere } from '../create/createSphere';
import { degreesToRadians } from '../utils/degreesToRadians';

/**
 * Renders a 3D sphere.
 *
 * @param gl WebGLRenderingContext
 * @param sphere `Sphere`
 * @param projectionMatrix The projection matrix
 * @param modelViewMatrix The model-view matrix
 */
export function renderSphere(
    gl: WebGLRenderingContext,
    sphere: Sphere,
    projectionMatrix: mat4,
    modelViewMatrix: mat4
): void {
    const { sphereData, sphereShader, sphereBuffers, sphereTexture } = sphere;

    gl.useProgram(sphereShader.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.vertices);
    gl.vertexAttribPointer(sphereShader.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(sphereShader.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.textureCoords);
    gl.vertexAttribPointer(sphereShader.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(sphereShader.attribLocations.textureCoord);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sphereTexture);
    gl.uniform1i(sphereShader.uniformLocations.uSampler, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffers.indices);

    gl.uniformMatrix4fv(sphereShader.uniformLocations.uProjectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(sphereShader.uniformLocations.uModelViewMatrix, false, modelViewMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.normals);
    gl.vertexAttribPointer(sphereShader.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(sphereShader.attribLocations.vertexNormal);

    // Offset because of texture alignment
    mat4.rotateY(modelViewMatrix, modelViewMatrix, degreesToRadians(180));

    // Get basic position of the sun based on time of day
    const directionalOffset = 4;
    const minutesInAnHour = 60;
    const minutesInADay = 1440;
    const date = new Date(1679006280000); // 1679006280000 < launch time
    const minutesPassedToday =
        (date.getHours() - directionalOffset) * minutesInAnHour + date.getMinutes();

    const zOffset = minutesInADay;
    const x = 1 * Math.cos((2 * Math.PI * minutesPassedToday) / minutesInADay);
    const z = 1 * Math.sin((2 * Math.PI * minutesPassedToday - zOffset) / minutesInADay);

    // Create a vector for the light direction in world space.
    const lightDirectionWorld = vec3.fromValues(x, 0, z);
    // Normalize the light direction (important for accurate lighting calculations).
    vec3.normalize(lightDirectionWorld, lightDirectionWorld);

    // Transform the light direction to eye space.
    const lightDirectionEye = vec3.create();
    const normalMatrix = mat3.create();
    mat3.fromMat4(normalMatrix, modelViewMatrix); // Extract the 3x3 upper-left portion of the modelViewMatrix.
    vec3.transformMat3(lightDirectionEye, lightDirectionWorld, normalMatrix);
    // Send the transformed light direction to the shader.
    gl.uniform3f(
        sphereShader.uniformLocations.uLightDirection,
        lightDirectionEye[0],
        lightDirectionEye[1],
        lightDirectionEye[2]
    );

    // Ambient light
    const ambientLightIntensity = 0.25;
    gl.uniform1f(
        gl.getUniformLocation(sphereShader.program, 'uAmbientLightIntensity'),
        ambientLightIntensity
    );

    gl.drawElements(gl.TRIANGLES, sphereData.indices.length, gl.UNSIGNED_SHORT, 0);
}

// Degree coordinates for derbugging.

// Home
// const lat = 0;
// const lon = 0;

// Africa
// const lat = 10;
// const lon = 20;

// Denmark
// const lat = 55.76606466124124;
// const lon = 10.454637760201754;

// Colorado
// const lat = 39.00160697707684;
// const lon = -105.40147909502214;

// Seattle
// const lat = 47.634974998076544;
// const lon = -122.32740893213284;

// Launch pad
// const lat = 28.485756939868025;
// const lon = -80.54286584159074;

// Good view from side
// const lat = -10.103611398396886;
// const lon = -40.96248802667276;

// LEO
// const lat = 36.71030376756076;
// const lon = -71.07192942889955;
