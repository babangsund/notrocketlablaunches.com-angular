type Callback = (dimensions: { width: number; height: number }) => void;

export function createResizeObserver(element: Element, callback: Callback): ResizeObserver {
    const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry.contentBoxSize) {
            const boundingBox = entry.contentBoxSize?.[0];

            const width = boundingBox.inlineSize;
            const height = boundingBox.blockSize;
            const dimensions = { width, height };

            callback(dimensions);
        }
    });

    resizeObserver.observe(element);

    return resizeObserver;
}
