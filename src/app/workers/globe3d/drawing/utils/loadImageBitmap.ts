const cache = new Map();

/**
 * Fetches an image as a blob and converts it to an image bitmap.
 *
 * @param url URL of the image to load
 * @returns Promise that resolves to the image bitmap.
 */
export async function loadImageBitmap(url: string): Promise<ImageBitmap> {
    const cached = cache.get(url);
    if (cached) return cached;

    const request = await fetch(url)
        .then(async (res) => await res.blob())
        .then(async (blob) => await createImageBitmap(blob));

    cache.set(url, request);

    return request;
}
