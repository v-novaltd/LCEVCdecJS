#version 100
precision ##float_precision## float;

uniform sampler2D textureY;
uniform sampler2D textureU;
uniform sampler2D textureV;
uniform vec2 videoSize;
uniform vec2 dithering;

varying vec2 uv;

/*
textureY,U,V is packed 4:1 of upscaled video (therefore x 1 y 1)
output is unpacked 4:1 (therefore x 2 y 2)



The packed pixels...
  Y
    AB
    CD
  U
    AB
    CD
  V
    AB
    CD

will become...

    AA
    A1

*/

##video_functions##



vec2 inputSize  = videoSize * vec2( 1.0, 1.0 );
vec2 outputSize = videoSize * vec2( 2.0, 2.0 );

vec2 offsetOut = vec2( 0.0, 0.0 );

void main(){

  // get input pixel
  vec2 pixelIn = uv + (offsetOut *-0.5) / inputSize;
  vec4 srcTexY = texture2D( textureY, pixelIn );
  vec4 srcTexU = texture2D( textureU, pixelIn );
  vec4 srcTexV = texture2D( textureV, pixelIn );

  // get output pixel
  vec2 pixelOut = uv;
  float component = step( 0.99999, mod( gl_FragCoord.x - offsetOut.x, 2.0 )) + step( 0.99999, mod( gl_FragCoord.y - offsetOut.y, 2.0 )) * 2.0;
  vec3 YUV = vec433componentf( srcTexY, srcTexU, srcTexV, component );

  // convert to RGB
  vec3 RGB = YUVtoRGB( YUV );


  // pack
  gl_FragColor = vec4( RGB, 1.0 );
}
