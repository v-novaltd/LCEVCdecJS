#version 100
precision ##float_precision## float;

uniform sampler2D textureVideo;
uniform sampler2D textureResidual;
uniform vec2 videoSize;

varying vec2 uv;

##video_functions##


vec2 halfPixel = vec2( -0.499999 );

vec2 inputSize  = videoSize * vec2( 1.0, 1.0 );
vec2 outputSize = videoSize * vec2( 0.5, 0.5 );

void main(){

  // video is 2x width of output
  vec2 pixelOut = (uv * outputSize);
  vec2 pixelTex = (uv * inputSize) + halfPixel;

  //
  vec2 uv0 = (pixelTex + vec2( 0.0, 0.0 )) / inputSize;
  vec2 uv1 = (pixelTex + vec2( 1.0, 0.0 )) / inputSize;
  vec2 uv2 = (pixelTex + vec2( 0.0, 1.0 )) / inputSize;
  vec2 uv3 = (pixelTex + vec2( 1.0, 1.0 )) / inputSize;

  // get quad of 4 pixels (to cram into this 1)
  vec3 pixel0 = texture2D( textureVideo, uv0 ).rgb;
  vec3 pixel1 = texture2D( textureVideo, uv1 ).rgb;
  vec3 pixel2 = texture2D( textureVideo, uv2 ).rgb;
  vec3 pixel3 = texture2D( textureVideo, uv3 ).rgb;

  // convert values to YUV
  float pixel0Y = RGBtoY( pixel0 );
  float pixel1Y = RGBtoY( pixel1 );
  float pixel2Y = RGBtoY( pixel2 );
  float pixel3Y = RGBtoY( pixel3 );

  // add perseus base residual
  vec4 texResidual = vec4( residualFloat( texture2D( textureResidual, uv ).a ));

  // pack
  gl_FragColor = vec4( pixel0Y, pixel1Y, pixel2Y, pixel3Y ) + texResidual;
}
