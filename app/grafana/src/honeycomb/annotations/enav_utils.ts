import { Vector3, Matrix4, Quaternion } from 'three';

const tempVec3 = new Vector3();
const tempScale = new Vector3();
const tempQuat = new Quaternion();
const tempMat4 = new Matrix4();

// copies the contents of source into target padded on each side by value assuming
// both represent 2d arrays. Target is expected to have length (width + padding)^2
// and source width^2.
function paddedCopy(
    width: number,
    source: Float32Array,
    target: Float32Array,
    padding: number,
    value: number
) {
    const stride = width + padding * 2;
    target.fill(value);

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < width; y++) {
            const i = y * width + x;
            const i2 = (y + padding) * stride + padding + x;

            target[i2] = source[i];
        }
    }
}

// expand heightmap by "Mip Flooding"
// taken from "Interactive Wind and Vegetation in 'God of War'"
// by Sean Feeley slides 106-107
// http://advances.realtimerendering.com/s2019/index.htm
function mipFlood(
    width: number,
    heightmap: Float32Array,
    invalidCellValue: number,
    padding = 0,
    mipChain: Record<number, { cellZ: Float32Array, numCells: number }> = {}
) {
    let rootMip = mipChain[0];
    const paddedWidth = width + padding * 2;
    if (!rootMip || rootMip.cellZ.length !== paddedWidth * paddedWidth) {
        for (const key in mipChain) {
            delete mipChain[key];
        }

        rootMip = { cellZ: new Float32Array(paddedWidth * paddedWidth), numCells: paddedWidth };
        mipChain[0] = rootMip;
    }

    paddedCopy(width, heightmap, rootMip.cellZ, padding, invalidCellValue);

    const originalWidth = paddedWidth;
    const totalMipLevels = ~~(Math.log(originalWidth) / Math.log(2));
    for (let i = 1; i <= totalMipLevels; i++) {
        // bitshift to divide by 2
        const parent = mipChain[i - 1];
        const parentMip = parent.cellZ;
        const parentWidth = parent.numCells;

        const currWidth = parentWidth >> 1;
        let currLength = currWidth * currWidth;
        if (!(i in mipChain)) {
            mipChain[i] = { cellZ: new Float32Array(currLength), numCells: currWidth };
        }
        const currMip = mipChain[i].cellZ;

        // init as all bad values
        currMip.fill(invalidCellValue);

        for (let x = 0; x < currWidth; x++) {
            for (let y = 0; y < currWidth; y++) {
                let validCount = 0;
                let zValue = 0;
                const currMipIndex = x * currWidth + y;

                // look at parent mip's 4 values and average
                for (let parentMipX = 0; parentMipX <= 1; parentMipX++) {
                    for (let parentMipY = 0; parentMipY <= 1; parentMipY++) {
                        const parentMipIndex =
                            (x * 2 + parentMipX) * parentWidth + (y * 2 + parentMipY);
                        const parentMipValue = parentMip[parentMipIndex];
                        if (parentMipValue !== invalidCellValue) {
                            validCount++;
                            zValue += parentMipValue;
                        }
                    }
                }

                if (validCount !== 0) {
                    currMip[currMipIndex] = zValue / validCount;
                }
            }
        }
    }

    for (let i = totalMipLevels - 1; i >= 0; i--) {
        const childMip = mipChain[i + 1].cellZ;
        const childNum = mipChain[i + 1].numCells;
        const currMip = mipChain[i].cellZ;
        const currNum = mipChain[i].numCells;
        for (let x = 0; x < currNum; x++) {
            for (let y = 0; y < currNum; y++) {
                const currMipIndex = x * currNum + y;
                const currMipVal = currMip[currMipIndex];
                if (currMipVal === invalidCellValue) {
                    let currVal = 0;
                    // evalutate neighboring cells
                    for (let j = -1; j <= 1; j += 2) {
                        for (let k = -1; k <= 1; k += 2) {
                            let neighborX = x + j;
                            let neighborY = y + k;
                            if (neighborX < 0 || neighborX >= currNum) {
                                neighborX = x;
                            }
                            if (neighborY < 0 || neighborY >= currNum) {
                                neighborY = y;
                            }

                            // if data exists at current mip level, use that instead
                            const neighborMipIndex = neighborX * currNum + neighborY;
                            const neighborMipVal = currMip[neighborMipIndex];
                            if (neighborMipVal !== invalidCellValue) {
                                currVal += neighborMipVal;
                            } else {
                                // get data from one mip level down and use bilinear filtering
                                const childMipU = neighborX / currNum;
                                const childMipV = neighborY / currNum;
                                const lowerU = ~~(childMipU * childNum);
                                const lowerV = ~~(childMipV * childNum);
                                const upperU = lowerU === childNum - 1 ? lowerU : lowerU + 1;
                                const upperV = lowerV === childNum - 1 ? lowerV : lowerV + 1;
                                const fractionU = childMipU * childNum - lowerU;
                                const fractionV = childMipV * childNum - lowerV;

                                const lowerULowerVIndex = lowerU * childNum + lowerV;
                                const lowerUUpperVIndex = lowerU * childNum + upperV;
                                const upperULowerVIndex = upperU * childNum + lowerV;
                                const upperUUpperVIndex = upperU * childNum + upperV;

                                currVal +=
                                    (childMip[lowerULowerVIndex] * (1 - fractionU) +
                                        childMip[upperULowerVIndex] * fractionU) *
                                    (1 - fractionV) +
                                    (childMip[lowerUUpperVIndex] * (1 - fractionU) +
                                        childMip[upperUUpperVIndex] * fractionU) *
                                    fractionV;
                            }
                        }
                    }

                    currMip[currMipIndex] = currVal / 4;
                }
            }
        }
    }

    return mipChain;
}

export {
    mipFlood,
    tempVec3,
    tempScale,
    tempQuat,
    tempMat4,
};
