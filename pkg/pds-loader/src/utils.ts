import { VicarLabel, VicarValue } from "@gov.nasa.jpl.honeycomb/vicar-loader";

// Parse label values into numbers, strings, or arrays
function parseValue(val: string, name: string): VicarValue {
    if (val[0] === '(') {
        const tokens = val.replace(/[()]/g, '').split(/,/g);
        return tokens.map(v => parseValue(v.trim(), name));
    } else if (val[0] === '"') {
        return val.substring(1, val.length - 1).replace(/""/g, '"');
    } else {
        const p = Number(val);
        if (isNaN(p)) {
            if (/^\w+$/.test(val)) {
                console.warn(
                    `PDSLoader: Found enumeration ${val} for label "${name}" but returning as a string.`,
                );
            }
            return val;
        }
        else {
            return p;
        }
    }
}

// Reads the header bytes up until "END" is found.
function readHeaderString(buffer: Uint8Array) {
    // make sure END is followed by a newline to ensure we don't grab END_GROUP or END_OBJECT.
    const END_REGEXP = /[\r\n]\s*END[\r\n]$/;
    let str = '';
    for (let i = 0, l = buffer.length; i < l; i++) {
        str += String.fromCharCode(buffer[i]);
        if (END_REGEXP.test(str)) {
            break;
        }
    }

    // if END shows up at the end of the file we won't have a newline. Insert one to check.
    if (END_REGEXP.test(str) || END_REGEXP.test(str.trim() + '\n')) {
        return str;
    } else {
        throw new Error('PDSLoader: END not found to terminate header.');
    }
}

function processLabelGroup(tokens: string[], target: VicarLabel[], offset: number = 0, endGroupName?: string) {
    // Iterate over the array by two
    for (let i = offset, l = tokens.length; i < l; i += 2) {
        const name = tokens[i].trim();
        if (name === 'END') {
            return tokens.length - 1;
        }

        let val = tokens[i + 1];
        switch (name) {
            // If we've found the end of this structure a structure
            case 'END_GROUP':
            case 'END_OBJECT': {
                if (!val || val === endGroupName) {
                    return i;
                } else {
                    throw new Error(
                        `PDSLoader: Didn't find matching group end label for "${endGroupName}".`,
                    );
                }
            }

            // If we've found the beginning of another structure
            case 'GROUP':
            case 'OBJECT': {
                const groupLabels: VicarLabel[] = [];
                i = processLabelGroup(tokens, groupLabels, i + 2, val);
                if (val in target) {
                    console.warn(`PDSLoader: Found group with duplicate name "${val}".`);
                }
                target.push({ isLabelGroup: true, name: val, value: groupLabels as any });
                break;
            }

            default: {
                val = parseValue(val, name) as string;
                target.push({ name, value: val });
            }
        }
    }

    if (endGroupName === null) {
        throw new Error('PDSLoader: Didn\'t find END token when parsing labels.');
    } else {
        throw new Error(
            `PDSLoader: Didn't find matching group end label for group "${endGroupName}".`,
        );
    }
}

function parseLabels(s: string) {
    // Replace comments
    s = s.replace(/\/\*.*[\n\r]/g, '\n');

    // Replace whitespace around = so values on new lines aren't parsed incorrectly
    s = s.replace(/[\s\n\r]*=[\s\n\r]*/g, ' = ');

    // Remove empty lines
    const lines = s.split(/\n/g).filter(v => !! v.trim());

    // Generate an interleaved array of names and values
    const tokens = [];
    for (let i = 0, l = lines.length; i < l; i++) {
        const line = lines[i];
        if (/=/.test(line)) {
            const split = line.split(/=/);
            const name = split[0];
            let value = split[1];

            // If we found a string without an end scoop up the remaining lines until we find the
            // end. Do the same for arrays
            if (/^"/.test(value.trim())) {
                const endQuoteRegex = /"$/;
                while (value.trim().length === 1 || !endQuoteRegex.test(value.trim())) {
                    i++;
                    value += '\n' + lines[i];
                }
            } else if (/^\(/.test(value.trim())) {
                while (!/\)$/.test(value.trim())) {
                    i++;
                    value += lines[i];
                }
            }
            tokens.push(name.trim(), value.trim());
        } else {
            tokens.push(line.trim(), "");
        }
    }

    const labels: VicarLabel[] = [];
    processLabelGroup(tokens, labels);

    return labels;
}

function getFirstLabelInstance<T extends string | number | VicarValue>(labels: VicarLabel[], path: string, defaultValue?: T): T {
    const tokens = path.split(/\./g);
    let currLabel = labels.find(l => l.name === tokens[0]);
    if (currLabel === undefined) {
        if (defaultValue === undefined) {
            throw new Error(`PDS Label ${path} not found`);
        }
        return defaultValue;
    }

    for (let i = 1; i < tokens.length; i++) {
        if (currLabel === undefined || !currLabel.isLabelGroup) {
            if (defaultValue === undefined) {
                throw new Error(`PDS Label ${path} not found`);
            }
            return defaultValue;
        }

        const value = currLabel.value as any as VicarLabel[];
        currLabel = value.find(l => l.name === tokens[i]);
    }

    if (currLabel === undefined && defaultValue === undefined) {
        throw new Error(`PDS Label ${path} not found`);
    }

    return (currLabel ? currLabel.value : defaultValue)! as T;
}

export { parseLabels, readHeaderString, getFirstLabelInstance };
