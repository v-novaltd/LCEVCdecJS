#version 100
precision ##float_precision## float;

uniform sampler2D textureVideo;
uniform vec2 videoSize;

varying vec2 uv;

##video_functions##


vec2 halfPixel = vec2( -0.499999 );

vec2 inputSize  = videoSize * vec2( 1.0, 1.0 );
vec2 outputSize = videoSize * vec2( 0.5, 0.5 );

void main(){

  // video is 4x width of output
  vec2 pixelOut = (uv * outputSize);
  vec2 pixelTex = (uv * inputSize) + halfPixel;

  // get quad of 4 pixels (to cram into this 1)
  vec3 pixel0 = texture2D( textureVideo, (pixelTex + vec2( 0.0, 0.0 )) / inputSize ).rgb;
  vec3 pixel1 = texture2D( textureVideo, (pixelTex + vec2( 1.0, 0.0 )) / inputSize ).rgb;
  vec3 pixel2 = texture2D( textureVideo, (pixelTex + vec2( 0.0, 1.0 )) / inputSize ).rgb;
  vec3 pixel3 = texture2D( textureVideo, (pixelTex + vec2( 1.0, 1.0 )) / inputSize ).rgb;

  // convert values to YUV
  float pixel0V = RGBtoV( pixel0 );
  float pixel1V = RGBtoV( pixel1 );
  float pixel2V = RGBtoV( pixel2 );
  float pixel3V = RGBtoV( pixel3 );

  // pack
  gl_FragColor = vec4( pixel0V, pixel1V, pixel2V, pixel3V );
}
