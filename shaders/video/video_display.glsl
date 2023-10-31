#version 100
precision ##float_precision## float;

uniform sampler2D textureFrame;
uniform sampler2D textureNoise;
uniform vec2 frameSize;
uniform vec2 outputSize;
uniform vec3 dithering;

varying vec2 uv;

##video_functions##



void main(){

  // get frame texture
  vec3 srcTex = texture2D( textureFrame, uv ).rgb;

  // dither noise texture
  float ditherTexSize = 512.0;
  float noise = texture2D( textureNoise, (uv + dithering.xy / ditherTexSize) * outputSize / ditherTexSize ).a;
  float strength = dithering.z / 127.5;
  srcTex = srcTex + vec3( noise - 0.5 ) * strength;

  // dither noise procedural
  /*
  float noise = generateNoise( uv, dithering.x );
  float strength = dithering.y / 127.5;
  srcTex = srcTex + vec3( noise - 0.5 ) * strength;
  */

  // pack
  gl_FragColor = vec4( srcTex, 1.0 );
}
