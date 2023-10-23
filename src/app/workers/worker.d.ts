declare global {
    interface FontFaceSet {
        /**
         * Appends a new element with a specified value to the end of the Set.
         *
         * [MDN](https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/add)
         */
        add(font: FontFace): void;
    }
}

export {};
