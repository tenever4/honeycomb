/**
 * @author zz85 / https://github.com/zz85
 *
 * Based on "A Practical Analytic Model for Daylight"
 * aka The Preetham Model, the de facto standard analytic skydome model
 * http://www.cs.utah.edu/~shirley/papers/sunsky/sunsky.pdf
 *
 * First implemented by Simon Wallner
 * http://www.simonwallner.at/projects/atmospheric-scattering
 *
 * Improved by Martin Upitis
 * http://blenderartists.org/forum/showthread.php?245954-preethams-sky-impementation-HDR
 *
 * Three.js integration by zz85 http://twitter.com/blurspline
 */

// THREE example Sky shader modified by Ryan Kinnett to reflect Mars atmosphere.

// Uniform intial values from
// https://github.jpl.nasa.gov/fplatt/roverviewer-dev/blob/f3ef1676a31b355f2724bd8c1bd5b89ff2835410/stateviewermesh.sky.html#L216

// Other possible values documented in
// https://mslsmsaweb1.jpl.nasa.gov/eo/saspah/roverviewer/stateviewermesh.sky.html

//REF:  Physically Based Rendering of the Martian Atmosphere: http://elib.dlr.de/86477/1/Collienne_GI_VRAR_2013.pdf

import { Vector3 } from 'three';

/**
 * @typedef {Object} MarsSkyShader
 * A three.js shader definition with `vertexShader`, `fragmentShader`, and `uniforms`.
 * Originally based on the {@link https://threejs.org/examples/?q=sky#webgl_shaders_sky three.js sky example shader}.
 *
 * @param {Object} uniforms
 * ```js
 * {
 *     luminance = 1.0 : Number,
 *
 *     turbidity = 0.8 : Number,
 *
 *     rayleigh = 0.005 : Number,
 *
 *     mieCoefficient = 0.005 : Number,
 *
 *     mieDirectionalG = 0.8 : Number,
 *
 *     // The position of the sun in world space. This is relative to the
 *     // skys coordinate frame.
 *     sunPosition = 0, 0, 0 : Vector3
 * }
 * ```
 */
const MarsSkyShader = {
    uniforms: {
        luminance: { value: 1.0 },
        turbidity: { value: 0.8 },
        rayleigh: { value: 0.005 },
        mieCoefficient: { value: 0.005 },
        mieDirectionalG: { value: 0.8 },
        sunPosition: { value: new Vector3() },
    },

    vertexShader: [
        'uniform vec3 sunPosition;',
        'uniform float rayleigh;',
        'uniform float turbidity;',
        'uniform float mieCoefficient;',

        'varying vec3 vSunDirection;',
        'varying vec3 vWorldPosition;',
        'varying float vSunfade;',
        'varying vec3 vBetaR;',
        'varying vec3 vBetaM;',
        'varying float vSunE;',

        'const vec3 up = vec3(0.0, 0.0, -1.0);',

        // constants for atmospheric scattering
        'const float e = 2.71828182845904523536028747135266249775724709369995957;',
        'const float pi = 3.141592653589793238462643383279502884197169;',

        // mie stuff
        // K coefficient for the primaries
        //"const float v = 4.0;",
        'const float v = 4.0;',
        //"const vec3 K = vec3(0.686, 0.678, 0.666);", // earth
        'const vec3 K = vec3(0.566, 0.668, 0.766);', // mars  ???

        // see http://blenderartists.org/forum/showthread.php?321110-Shaders-and-Skybox-madness
        // A simplied version of the total Reayleigh scattering to works on browsers that use ANGLE  http://stackoverflow.com/questions/27348125/colors-output-from-webgl-fragment-shader-differ-significantly-across-platforms
        //"const vec3 simplifiedRayleigh = 0.0005 / vec3(94, 40, 18);", // earth
        //"const vec3 simplifiedRayleigh = vec3(5.3E-5, 1.3E-4, 2.8E-4);", // earth
        //"const vec3 simplifiedRayleigh = vec3(19.918E-3, 13.57E-3, 5.75E-3);", // mars,   http://elib.dlr.de/86477/1/Collienne_GI_VRAR_2013.pdf pg 10
        'const vec3 simplifiedRayleigh = vec3(22E-3, 11E-3, 6E-3);', // mars,   MOD

        // wavelength of used primaries, according to preetham  // red: 700nm, blue: 400nm
        //"const vec3 lambda = vec3(680E-9, 550E-9, 450E-9);",   // earth
        'const vec3 lambda = vec3(680E-9, 510E-9, 440E-9);', // mars,  http://elib.dlr.de/86477/1/Collienne_GI_VRAR_2013.pdf pg 10

        // earth shadow hack
        //"const float cutoffAngle = pi/1.95;",
        'const float cutoffAngle = pi/1.95;',
        //"const float steepness = 1.5;",
        'const float steepness = 1.5;',
        //"const float EE = 1000.0;", //earth
        'const float EE = 500.0;', //mars

        'float sunIntensity(float zenithAngleCos)',
        '{',
        'return EE * max(0.0, 1.0 - pow(e, -((cutoffAngle - acos(zenithAngleCos))/steepness)));',
        '}',

        'vec3 totalMie(vec3 lambda, float T)',
        '{',
        'float c = (0.2 * T ) * 10E-18;',
        'return 0.434 * c * pi * pow((2.0 * pi) / lambda, vec3(v - 2.0)) * K;',
        '}',

        'void main() {',

        'vec4 worldPosition = modelMatrix * vec4( position, 1.0 );', //change to const because I don't expect to move the sky sphere from (0,0,0)

        // Garrett: Change from `worldPosition` to `position` so the sky shading is
        // handled in object frame rather than world frame, meaning it can be rotated.
        // "vWorldPosition = worldPosition.xyz;", //change to const because I don't expect to move the sky sphere from (0,0,0)
        'vWorldPosition = position.xyz;', //change to const because I don't expect to move the sky sphere from (0,0,0)

        'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

        'vSunDirection = normalize(sunPosition);',

        'vSunE = sunIntensity(dot(vSunDirection, up));',

        //"vSunfade = 1.0-clamp(1.0-exp((sunPosition.y/450000.0)),0.0,1.0);",
        //"vSunfade = clamp(exp((-sunPosition.z/40000.0)) ,0.0,1.0);",
        //"vSunfade = clamp(exp(-vSunDirection.z) ,0.0,1.0);",
        //"vSunfade = 1.0-clamp(1.0-exp(-1.0*vSunDirection.z),0.0,1.0);",
        //"vSunfade = clamp( exp( -1.0*vSunDirection.z) ,0.0,1.0);",
        'vSunfade = clamp( exp( -1.0*vSunDirection.z) ,0.0,1.0);',

        //"float rayleighCoefficient = rayleigh - (1.0 * (1.0-vSunfade));",
        //"float rayleighCoefficient = rayleigh - 1.0 + vSunfade;",
        //"float rayleighCoefficient = clamp( rayleigh - 1.0 + vSunfade, 0.0,1.0);",
        //"float rayleighCoefficient = max(0.0, rayleigh + vSunfade - 1.0);",
        'float rayleighCoefficient = max(0.0, rayleigh * vSunfade);', // WOOOOHOOO FIXED!

        // extinction (absorbtion + out scattering)
        // rayleigh coefficients
        'vBetaR = simplifiedRayleigh * rayleighCoefficient;',

        // mie coefficients
        'vBetaM = totalMie(lambda, turbidity) * mieCoefficient;',

        '}',
    ].join('\n'),

    fragmentShader: [
        'varying vec3 vSunDirection;',
        'varying vec3 vWorldPosition;',
        'varying float vSunfade;',
        'varying vec3 vBetaR;',
        'varying vec3 vBetaM;',
        'varying float vSunE;',

        'uniform float luminance;',
        'uniform float mieDirectionalG;',

        'const vec3 cameraPos = vec3(0., 0., 0.);',

        // make vWorldPosition const because we probably won't move it from 0,0,0
        //"const vec3 vWorldPosition = vec3(0.0, 0.0, 0.0);",

        // constants for atmospheric scattering
        'const float pi = 3.141592653589793238462643383279502884197169;',

        //"const float n = 1.0003;", // refractive index of air
        //"const float n = 1.000206102;", // refractive index of air
        'const float n = 1.000449;', // refractive index of co2
        //"const float N = 2.545E25;", // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)
        'const float N = 2.545E27;', //above scaled to 1%

        // optical length at zenith for molecules
        //"const float rayleighZenithLength = 8.4E3;", //earth
        'const float rayleighZenithLength = 11E3;', //mars, http://elib.dlr.de/86477/1/Collienne_GI_VRAR_2013.pdf pg 8
        //"const float mieZenithLength = 1.25E3;",
        'const float mieZenithLength = 1.0E3;', //experimenting
        'const vec3 up = vec3(0.0, 0.0, -1.0);',

        //"const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;",   // 66 arc seconds -> degrees, and the cosine of that
        'const float sunAngularDiameterCos = 0.9999999772477113;', // cos( 44 arcsec *1deg/3600arcsec * Math.PI rad /180 deg )

        'float rayleighPhase(float cosTheta)',
        '{',
        'return (3.0 / (16.0*pi)) * (1.0 + pow(max(0.0,cosTheta), 2.0));',
        '}',

        'float hgPhase(float cosTheta, float g)',
        '{',
        //"return (1.0 / (4.0*pi)) * ((1.0 - pow(g, 2.0)) / pow(max(0.0,1.0 - 2.0*g*cosTheta + pow(g, 2.0)), 1.5));",
        'return (1.0 / (4.0*pi)) * ((1.0 - pow(g, 2.0)) / pow(max(0.0,1.0 - 2.0*g*max(0.0,cosTheta) + pow(g, 2.0)), 1.5));',
        '}',

        // Filmic ToneMapping http://filmicgames.com/archives/75
        'const float A = 0.15;',
        'const float B = 0.50;',
        'const float C = 0.10;',
        'const float D = 0.20;',
        'const float E = 0.02;',
        'const float F = 0.30;',

        'const float degPerRad = 57.29577951;',
        'const float radPerDeg = 0.017453293;',

        'const float whiteScale = 1.0748724675633854;', // 1.0 / Uncharted2Tonemap(1000.0)

        'vec3 Uncharted2Tonemap(vec3 x)',
        '{',
        'return ((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F;',
        '}',

        'void main() ',
        '{',
        // optical length
        // cutoff angle at 90 to avoid singularity in next formula.
        //"float zenithAngle = acos(max(0.0, dot(up, normalize(vWorldPosition - cameraPos))));",
        'float zenithAngleCos = clamp(  dot(up, normalize(vWorldPosition - cameraPos))  , 0.0,1.0);',
        'float zenithAngle = acos(max(0.0, zenithAngleCos));',

        //"float sR = rayleighZenithLength / (zenithAngleCos + 0.15 * pow(max(0.0,93.885 - ((zenithAngle * 180.0) / pi)), -1.253));",
        //"float sR = rayleighZenithLength / (zenithAngleCos + 0.15 * pow(max(0.0, pi/2.0 +0.1 - zenithAngle), -1.253));",
        'float sR = rayleighZenithLength / (zenithAngleCos + 0.15 * pow(max(0.0, pi/2.0 +0.2 - zenithAngle), -1.253));',
        //"float sR = rayleighZenithLength / max(0.0001, (zenithAngleCos + 0.15 * pow(max(0.0,93.885 - zenithAngle * degPerRad), -1.253)));",
        //"float sM = mieZenithLength / (zenithAngleCos + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));",
        //"float sM = mieZenithLength / max(0.0001, (zenithAngleCos + 0.15 * pow(max(0.0,93.885 - zenithAngle * degPerRad), -1.253)));",
        //"float sM = mieZenithLength / max(0.0001, (zenithAngleCos + 0.2 * pow(max(0.0,pi/2.0 +0.1 - zenithAngle), -1.253)));",
        'float sM = mieZenithLength /(zenithAngleCos + 0.2 * pow(max(0.0,pi/2.0 +0.2 - zenithAngle), -1.253));',

        // combined extinction factor
        'vec3 Fex = exp(-(vBetaR * sR + vBetaM * sM));',

        // in scattering
        'float cosTheta = dot(normalize(vWorldPosition - cameraPos), vSunDirection);',
        //"float cosTheta = clamp( dot(normalize(vWorldPosition - cameraPos), vSunDirection), -1.0,1.0);",
        //"float cosTheta = clamp( dot(up, vSunDirection), -1.0,1.0);", //cos(elevation)
        'float theta = acos( cosTheta );',

        'float rPhase = rayleighPhase(cosTheta*0.5+0.5);',
        'vec3 betaRTheta = vBetaR * rPhase;',

        'float mPhase = hgPhase(cosTheta, mieDirectionalG);',
        'vec3 betaMTheta = vBetaM * mPhase;',

        'vec3 Lin = pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * (1.0 - Fex), vec3(1.5));',
        //"vec3 Lin = pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * (1.0 - Fex),vec3(1.5));",
        'Lin *= mix(vec3(1.0),pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * Fex, vec3(1.0/2.0)),clamp(pow(1.0-dot(up, vSunDirection),5.0),0.0,1.0));',

        //nightsky
        //"vec3 direction = normalize(vWorldPosition - cameraPos);",
        'vec3 direction = vec3(0., 0., 0.);',
        //"float theta = acos(-1.0*direction.z); // elevation --> y-axis, [-pi/2, pi/2]",
        'float phi = atan(direction.y, direction.x); // azimuth --> z-axis [-pi, pi]',
        //"vec2 uv = vec2(phi/2/pi, theta/pi) + vec2(0.5, 0.0);",
        'vec2 uv = vec2(phi/2.0/pi, theta/pi);',
        'vec3 L0 = vec3(0.1) * Fex;',

        // composition + solar disc
        'float sundisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos+0.00002, cosTheta);',
        'L0 += (vSunE * 1900.0 * Fex)*sundisk;',

        'vec3 texColor = (Lin+L0) * 0.04 + vec3(0.0, 0.0003, 0.00075);',
        //"vec3 texColor = (Lin+L0) * 0.04 + vec3(0.0006, 0.0003, 0.0001);",

        'vec3 curr = Uncharted2Tonemap((log2(2.0/pow(luminance,4.0)))*texColor);',
        'vec3 color = curr*whiteScale;',

        //"vec3 retColor = pow(color,vec3(1.0/(1.2+(1.2*vSunfade))));",
        // "vec3 retColor = pow(color,vec3(1.0/(1.2+(1.2*vSunfade))));",
        //"vec3 retColor = pow(color,vec3(1.0/(1.2+(1.2*vSunfade))));",
        'vec3 retColor = pow(color,vec3(1.0/(1.0+1.2*vSunfade)));',

        'gl_FragColor.rgb = retColor;',
        //"gl_FragColor.rgb = retColor;",

        'gl_FragColor.a = 1.0;',
        '}',
    ].join('\n'),
};

export { MarsSkyShader };
