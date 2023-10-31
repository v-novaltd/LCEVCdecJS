#version 100
precision ##float_precision## float;

uniform sampler2D textureVideo;
uniform sampler2D textureResidualBase;
uniform sampler2D textureResidualHigh;
uniform vec2 videoSize;
uniform float useBase;
uniform float useHigh;
uniform float isKeyFrame;

varying vec2 uv;

##video_functions##


vec2 inputSize  = videoSize * vec2( 1.0, 1.0 );
vec2 outputSize = videoSize * vec2( 1.0, 1.0 );

vec2 halfPixel = vec2( -0.499999 );

void main(){

  // video is 4x width of output
  vec2 pixelOut = floor( uv * outputSize );
  vec2 pixelTex = floor( uv * inputSize ) - halfPixel;

  // add perseus base residual
  vec4 texVid = texture2D( textureVideo, uv );
  float resBase = texture2D( textureResidualBase, uv ).a;

  // add perseus high residual
  float resHigh = texture2D( textureResidualHigh, uv ).a;

  //
  float luma = (texVid.r + texVid.g + texVid.b) / 3.0 * 0.4 + 0.6;

  //
  float isbase = step( 0.01, resBase ) * useBase;
  float ishigh = step( 0.01, resHigh ) * useHigh;
  float isboth = isbase * ishigh;
  float iseither = step( 0.01, isbase + ishigh );

  vec3 colBase = vec3( 1.0,-0.5,-0.5 ) * pow( abs(residualFloat(resBase)) / 0.5, 0.1 );
  vec3 colHigh = vec3(-0.5,-0.5, 1.0 ) * pow( abs(residualFloat(resHigh)) / 0.5, 0.1 );
  vec3 colBoth = vec3(-1.0, 1.0,-1.0 );
  vec3 colRes = mix( colBase * isbase + colHigh * ishigh, colBoth, isboth );
  vec3 colOut = luma + colRes;

  // key frame
  vec3 colKeyFrame = luma * vec3( 1.0, 0.5, 0.9 ) + vec3(-1.0) * iseither;

  // mix down
  vec3 colFinal = mix( colOut, colKeyFrame, isKeyFrame );
  gl_FragColor = vec4( colFinal, 1.0 );
}
