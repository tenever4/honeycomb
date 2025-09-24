import { VicarLabel, VicarLoaderBase, VicarResult } from '@gov.nasa.jpl.honeycomb/vicar-loader';
import { readHeaderString, parseLabels, getFirstLabelInstance } from './utils';
import { FetchArrayBufferLoader } from '@gov.nasa.jpl.honeycomb/common';

interface PDSResult {
    /**
     * The set of header labels in the file. This includes both the header
     * and EOL extension labels if present.
     */
    labels: VicarLabel[];

    /**
     * The image stored in the file based on the [Vicar loader result](../vicar-loader/README.md#VicarResult).
     *
     * This is present only if there are no product pointers in the header OR if there are only `IMAGE` and
     * `IMAGE_HEADER` objects that point to Vicar data in the same file.
     */
    product?: VicarResult;

    /**
     * The set of products pointed to by the header in either this file or separate ones.
     *
     * !> Note this is not currently implemented and separated data products will never be represented here.
     */
    products?: VicarLabel[];
}

// Spec: https://pds.nasa.gov/datastandards/pds3/standards/
/**
 * Class for loading and parsing PDS files.
 */
class PDSLoader extends FetchArrayBufferLoader<PDSResult> {
    /**
     * Parses the contents of the given PDS file and returns an object describing
     * the telemetry.
     */
    parse(arrayBufer: ArrayBuffer): PDSResult {
        const byteBuffer = new Uint8Array(arrayBufer);

        const headerString = readHeaderString(byteBuffer);
        const labels = parseLabels(headerString);
        const labelRecords = getFirstLabelInstance<number>(labels, 'LABEL_RECORDS', 1);
        const recordBytes = getFirstLabelInstance<number>(labels, 'RECORD_BYTES');
        const recordType = getFirstLabelInstance(labels, 'RECORD_TYPE');
        const labelSize = labelRecords * recordBytes;

        if (recordType !== 'FIXED_LENGTH') {
            throw new Error('PDSLoader: Non FIXED_LENGTH record types not supported');
        }

        const products: VicarLabel[] = [];
        for (const { name, value } of labels) {
            if (/^\^/.test(name)) {
                let path: string | number;
                if (Array.isArray(value)) {
                    path = value[0] as (string | number);
                } else if (typeof value === 'number') {
                    path = value * recordBytes;
                } else if (typeof value === 'string' && /<BYTES>/.test(value)) {
                    path = value.replace(/<BYTES>/, '');
                } else {
                    path = value;
                }

                products.push({
                    name: name.replace(/^\^/, ''),
                    value: path,
                });
            }
        }

        const result: PDSResult = {
            labels
        };

        const noProducts = products.length === 0;
        const justVicarProduct =
            products.length === 2 &&
            getFirstLabelInstance(products, 'IMAGE') !== undefined &&
            getFirstLabelInstance(products, 'IMAGE_HEADER') !== undefined &&
            typeof getFirstLabelInstance(labels, '^IMAGE') === 'number' &&
            typeof getFirstLabelInstance(labels, '^IMAGE_HEADER') === 'number' &&
            getFirstLabelInstance(labels, 'IMAGE_HEADER.HEADER_TYPE') === 'VICAR2';

        if (noProducts || justVicarProduct) {
            if (getFirstLabelInstance(labels, 'IMAGE_HEADER.HEADER_TYPE') === 'VICAR2') {
                const loader = new VicarLoaderBase();
                const vicarBuffer = new Uint8Array(
                    byteBuffer.buffer,
                    byteBuffer.byteOffset + labelSize,
                );
                result.product = loader.parse(vicarBuffer);
            } else {
                console.warn('PDSLoader: Could not parse PDS product.');
            }
        } else {
            result.products = products;
            console.warn(
                'PDSLoader: File contains product pointers which are not yet supported beyond IMAGE and IMAGE_HEADER for Vicar files.',
            );
        }

        return result;
    }
}

export { PDSLoader };
