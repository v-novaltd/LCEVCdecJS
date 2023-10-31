#version 100
precision ##float_precision## float;

uniform sampler2D textureIn;
uniform sampler2D textureResidual;
uniform vec2 videoSize;

varying vec2 uv;

##video_functions##



vec2 halfPixel = vec2( -0.499999 );

vec2 inputSize  = (videoSize + halfPixel);

void main(){
  vec2 pixelTex = floor( uv * inputSize ) - halfPixel;

  // get YUV
  vec3 YUV = texture2D( textureIn, (pixelTex + vec2( 0.0, 0.0 )) / inputSize ).rgb;

  // add perseus high residual
  float component = texture2D( textureResidual, uv ).a;
  YUV[0] = YUV[0] + residualFloat( component );

  // convert to RGB
  vec3 RGB = YUVtoRGB( YUV );

  // pack
  gl_FragColor = vec4( RGB, 1.0 );
}
