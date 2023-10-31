#version 100
precision ##float_precision## float;

uniform sampler2D textureIn;
uniform vec2 videoSize;

varying vec2 uv;

##video_functions##



void main(){

  // get YUV
  vec3 YUV = texture2D( textureIn, uv ).rgb;

  // convert to RGB
  vec3 RGB = YUVtoRGB( YUV );

  // pack
  gl_FragColor = vec4( RGB, 1.0 );
}
