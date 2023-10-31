#version 100
precision ##float_precision## float;

uniform sampler2D textureVideo;
uniform sampler2D textureResidual;

varying vec2 uv;

##video_functions##



void main(){

  // get RGB
  vec3 RGB = texture2D( textureVideo, uv ).rgb;

  // convert to YUV
  vec3 YUV = RGBtoYUV( RGB );

  // add perseus base residual
  YUV[0] = YUV[0] + residualFloat( texture2D( textureResidual, uv ).a );

  // pack
  gl_FragColor = vec4( YUV, 1.0 );
}
