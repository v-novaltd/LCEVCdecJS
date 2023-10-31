#version 100
precision ##float_precision## float;

uniform sampler2D textureVideo;

varying vec2 uv;

##video_functions##



void main(){

  // get RGB
  vec3 RGB = texture2D( textureVideo, uv ).rgb;

  // convert to YUV
  vec3 YUV = RGBtoYUV( RGB );

  // pack
  gl_FragColor = vec4( YUV, 1.0 );
}
