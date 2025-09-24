// spec:
// http://netpbm.sourceforge.net/doc/pgm.html

// example images:
// https://people.sc.fsu.edu/~jburkardt/data/pgmb/pgmb.html

// Issues
// - ASCII PGM files are not supported

export interface PGMResult {
    /**
     * The PGM laid out in an array in row major order where each row has a stride of `width`.
     */
    data: Uint16Array | Uint8Array;

    /**
     * The width of the pgm file in pixels.
     */
    width: number;

    /**
     * The height of the pgm file in pixels.
     */
    height: number;

    /**
     * The maximum gray value in the file.
     */
    maxValue: number;
}

function swapByteOrder(buffer: ArrayBuffer) {
    const byteBuffer = new Uint8Array(buffer);
    for (let i = 0; i < byteBuffer.byteLength; i += 2) {
        const temp = byteBuffer[i];
        byteBuffer[i] = byteBuffer[i + 1];
        byteBuffer[i + 1] = temp;
    }
}

/** Class for loading and parsing PGM image files */
export class PGMLoaderBase {
    /**
     * Fetch options for loading the file.
     */
    fetchOptions = { credentials: 'same-origin' as RequestCredentials };

    /**
     * Loads and parses the PGM file. The promise resolves with the returned
     * data from the {@link #PGMLoader#parse parse} function.
     */
    async load(url: string): Promise<PGMResult> {
        const res = await fetch(url, this.fetchOptions);
        if (!res.ok) {
            throw new Error(`PGMLoader: Failed to load file "${url}" with status ${res.status} : ${res.statusText}`);
        }
        const buffer = await res.arrayBuffer();
        return this.parse(buffer);
    }

    /**
     * Parses the contents of the given PGM and returns an object describing
     * the telemetry.
     */
    parse(buffer: ArrayBuffer): PGMResult {
        const dataView = new DataView(buffer);
        let currIndex = 0;

        // read the given number of bytes as a string
        function readString(len: number) {
            const end = currIndex + len;
            let s = '';
            for (; currIndex < end; currIndex++) {
                s += String.fromCharCode(dataView.getUint8(currIndex));
            }

            return s;
        }

        // read bytes as a string until the provided function returns true
        function readStringUntil(func: (v: string) => boolean) {
            let str = '';
            while (true) {
                const c = String.fromCharCode(dataView.getUint8(currIndex));

                if (func(c)) break;

                str += c;
                currIndex++;
            }

            return str;
        }

        // check file identifier
        if (readString(2) !== 'P5') {
            throw new Error('PGMLoader: Invalid file identifier');
        }

        // Consume header tokens until we have found three.
        // Continue for a fixed number of iterations so we
        // don't iterate unnecessarily long if there's a problem
        const MAX_ITERATIONS = 100;
        let header = '';
        let headerTokens: string[] = [];

        for (let i = 0; i < MAX_ITERATIONS; i++) {
            header += readStringUntil(c => /[\s\n\r]/g.test(c));
            header += readString(1);

            headerTokens = header

                // remove comments
                .replace(/#[^\n\r]*[\n\r]/g, '')

                // tokenize
                .split(/\s+/g)

                // remove empty tokens
                .filter(t => !!t);

            if (headerTokens.length === 3) {
                break;
            }
        }

        if (headerTokens.length !== 3) {
            throw new Error('PGMLoader: Could not parse header -- invalid number of header tokens');
        }

        const width = parseInt(headerTokens[0]);
        const height = parseInt(headerTokens[1]);
        const maxValue = parseInt(headerTokens[2]);
        const byteLen = maxValue < 256 ? 1 : 2;

        if (width * height * byteLen !== buffer.byteLength - currIndex) {
            throw new Error('PGMLoader: Invalid data length');
        }

        let data;
        if (byteLen === 1) {
            data = new Uint8Array(buffer, currIndex, width * height);
        } else {
            // Uint16Array cannot have an offset index that is not a
            // multiple of 2 so copy the data buffer here to its own
            // separate buffer
            const dataBuffer = buffer.slice(currIndex, currIndex + width * height * 2);

            // TODO: Handle endianness properly. We can't guarantee what the byte order of the file is
            // or what the byte order of the javascript platform is.
            // The expected endianness is flipped
            swapByteOrder(dataBuffer);

            data = new Uint16Array(dataBuffer);
        }

        return {
            data,
            width,
            height,
            maxValue,
        };
    }
}
