#version 100
precision ##float_precision## float;

uniform sampler2D textureVideo;
uniform vec2 videoSize;

varying vec2 uv;



void main(){

  // pass through video image
  vec3 colOut = texture2D( textureVideo, uv ).rgb;

  // pack
  gl_FragColor = vec4( colOut, 1.0 );
}
