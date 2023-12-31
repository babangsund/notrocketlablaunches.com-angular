export function loadFontFaceSet(fontFaceSet: FontFaceSet, fonts: Font[]): Promise<FontFaceSet> {
    fonts.forEach((font) => {
        const fontFace = fontFaces[font];
        fontFace.load();
        fontFaceSet.add(fontFace);
    });

    return fontFaceSet.ready;
}

export type Font = 'colfax' | 'blenderpro';

export const AVAILABLE_FONTS: Record<Font, Font> = {
    colfax: 'colfax',
    blenderpro: 'blenderpro',
};

const fontFaces: Record<Font, FontFace> = {
    colfax: new FontFace(
        'Colfax',
        "local('Colfax'), url(/assets/fonts/Colfax/Colfax-Regular.woff2) format('woff2')"
    ),
    blenderpro: new FontFace(
        'BlenderPro',
        "local('BlenderPro'), url(/assets/fonts/BlenderPro/BlenderPro-Bold.woff2) format('woff2')"
    ),
};
