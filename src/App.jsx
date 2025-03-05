import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei'; 
import * as THREE from 'three';


const vertexShader = `
varying vec2 vUv;
varying float vPattern;
uniform float uTime;


#define PI 3.14159265358979

vec2 m = vec2(.7,.8);

float hash( in vec2 p ) 
{
    return fract(sin(p.x*15.32+p.y*5.78) * 43758.236237153);
}


vec2 hash2(vec2 p)
{
	return vec2(hash(p*.754),hash(1.5743*p.yx+4.5891))-.5;
}


// Gabor/Voronoi mix 3x3 kernel (some artifacts for v=1.)
float gavoronoi3(in vec2 p)
{    
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    float f = 3.*PI;//frequency
    float v = 1.0;//cell variability <1.
    float dv = 0.0;//duniform float time;irection variability <1.
    vec2 dir = m + cos(uTime);//vec2(.7,.7);
    float va = 0.0;
   	float wt = 0.0;
    for (int i=-1; i<=1; i++) 
	for (int j=-1; j<=1; j++) 
	{		
        vec2 o = vec2(i, j)-.5;
        vec2 h = hash2(ip - o);
        vec2 pp = fp +o;
        float d = dot(pp, pp);
        float w = exp(-d*4.);
        wt +=w;
        h = dv*h+dir;//h=normalize(h+dir);
        va += cos(dot(pp,h)*f/v)*w;
	}    
    return va/wt;
}



float noise( vec2 p)
{   
    return gavoronoi3(p);
}

float map(vec2 p){

    return 2.*abs( noise(p*2.));

}

vec3 nor(in vec2 p)
{
	const vec2 e = vec2(0.1, 0.0);
	return -normalize(vec3(
		map(p + e.xy) - map(p - e.xy),
		map(p + e.yx) - map(p - e.yx),
		1.0));
}




void main() {

    vec3 light = normalize(vec3(3., 2., -1.));
	float r = dot(nor(uv), light);

    vec3 newPosition = position + normal * clamp(1.0 - r, 0.0 , 0.2);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    
    
    vUv = uv;
    vPattern = r;
}
`;

const fragmentShader = `
varying vec2 vUv;
varying float vPattern;
uniform float uTime;

// COLOR_RAMP ------------------------------------------------
struct ColorStop {
    vec3 color;
    float position;
};

#define COLOR_RAMP(colors, factor, finalColor) { \
    int index = 0; \
    for(int i = 0; i < colors.length() - 1; i++){ \
       ColorStop currentColor = colors[i]; \
       bool isInBetween = currentColor.position <= factor; \
       index = int(mix(float(index), float(i), float(isInBetween))); \
    } \
    ColorStop currentColor = colors[index]; \
    ColorStop nextColor = colors[index + 1]; \
    float range = nextColor.position - currentColor.position; \
    float lerpFactor = (factor - currentColor.position) / range; \
    finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
} \

void main() {
    float time = uTime;

    vec3 color;

    vec3 mainColor = vec3(0.6, 0.4, 0.9);

    mainColor.r *= 0.9 + sin(time) / 3.2;
    mainColor.g *= 0.9 + cos(time / 2.0) / 2.5;
    mainColor.b *= 0.9 + cos(time / 5.0) / 4.0;

    mainColor.rgb += 0.1;

    ColorStop[4] colors = ColorStop[4](
        ColorStop(vec3(1.0), 0.0),
        ColorStop(vec3(1.0), 0.01),
        ColorStop(mainColor, 0.1),
        ColorStop(vec3(0.01, 0.05, 0.2), 1.0)
    );
    COLOR_RAMP(colors, vPattern, color);
    gl_FragColor = vec4(color, 1.0);
}
`;


const ShaderSphere = () => {
  const meshRef = useRef();
  const uniforms = useRef({
    uTime: { value: 0 },
    uAudioFrequency: { value: 1.0 }, 
  });

  useFrame(({ clock }) => {
    if (meshRef.current) {
      
      uniforms.current.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} /> {/* Radius: 1, Segments: 32x32 */}
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms.current}
      />
    </mesh>
  );
};


const App = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }} 
      style={{ width: '100vw', height: '100vh' }} // Fullscreen canvas
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <ShaderSphere />
      <OrbitControls /> {/* Add OrbitControls for camera interaction */}
    </Canvas>
  );
};

export default App;