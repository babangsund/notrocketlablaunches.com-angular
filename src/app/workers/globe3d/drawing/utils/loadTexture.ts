import { loadImageBitmap } from './loadImageBitmap';

/**
 * Loads a texture and flips it vertically.
 *
 * @param gl WebGLRenderingContext
 * @param url URL of the texture to load
 * @param scaleX Horizontal scale
 * @param scaleY Vertical scale
 * @param callback Called when the texture is done loading
 * @returns A promise that resolves with the texture
 */
export async function loadTexture(
    gl: WebGLRenderingContext,
    url: string,
    scaleX = 1,
    scaleY = 1,
    callback?: (texture: WebGLTexture) => void
): Promise<WebGLTexture> {
    if (cache.has(url)) return cache.get(url);

    const texture = loadImageBitmap(url)
        .then(async (bitmap) => await flipImageVertically(bitmap, scaleX, scaleY))
        .then((imageBitmap) => {
            const texture = gl.createTexture();
            if (!texture) {
                throw new Error('Failed to create texture');
            }

            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageBitmap);
            // Min mag & mipmap
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);

            gl.bindTexture(gl.TEXTURE_2D, null);

            callback?.(texture);

            return texture;
        });

    cache.set(url, texture);

    return await texture;
}

const cache = new Map();

async function flipImageVertically(
    imageBitmap: ImageBitmap,
    scaleX: number,
    scaleY: number
): Promise<OffscreenCanvas> {
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to create 2d context for image bitmap');
    }

    ctx.translate(0, imageBitmap.height);
    ctx.scale(1, -1);
    ctx.scale(scaleX, scaleY);
    ctx.drawImage(imageBitmap, 0, 0);

    return canvas;
}
