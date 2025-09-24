import * as bz2 from 'bz2';
self.addEventListener('message', e => {
    const decompressedData = bz2.decompress(e.data);
    self.postMessage(decompressedData, [decompressedData.buffer]);
});
