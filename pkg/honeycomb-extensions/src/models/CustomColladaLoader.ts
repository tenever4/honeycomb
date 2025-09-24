import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';

class CustomColladaLoader extends ColladaLoader {
    parse(text: string, path: string) {
        text = text.replace(/".+?"/g, match => {
            return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        });
        return super.parse(text, path);
    }
}

export { CustomColladaLoader };
