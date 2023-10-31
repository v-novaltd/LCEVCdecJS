#version 100
precision ##float_precision## float;

uniform sampler2D textureIn;
uniform vec2 videoSize;

varying vec2 uv;

/*

*/



vec2 halfPixel = vec2( -0.499999 );

vec2 inputSize  = (videoSize + halfPixel) * vec2( 0.5, 1.0 );
vec2 outputSize = (videoSize + halfPixel) * vec2( 1.0, 1.0 );

// kernels
//vec4 k0 = vec4( 0.0, 0.25, 0.75, 0.0 ); // left kernel
//vec4 k1 = vec4( 0.0, 0.75, 0.25, 0.0 ); // right kernel
//vec4 k0 = vec4(     0.0,  2048.0, 16384.0, -2048.0 ) / 16384.0; // left kernel
//vec4 k1 = vec4( -2048.0, 16384.0,  2048.0,     0.0 ) / 16384.0; // right kernel
uniform vec4 k0;
uniform vec4 k1;



void main(){

  // get input pixels
  vec2 pixelTex = floor( uv * inputSize ) - halfPixel;
  vec3 srcTexL2 = texture2D( textureIn, (pixelTex + vec2( -2.0, 0.0 )) / inputSize ).rgb;
  vec3 srcTexL1 = texture2D( textureIn, (pixelTex + vec2( -1.0, 0.0 )) / inputSize ).rgb;
  vec3 srcTexC  = texture2D( textureIn, (pixelTex + vec2(  0.0, 0.0 )) / inputSize ).rgb;
  vec3 srcTexR1 = texture2D( textureIn, (pixelTex + vec2(  1.0, 0.0 )) / inputSize ).rgb;
  vec3 srcTexR2 = texture2D( textureIn, (pixelTex + vec2(  2.0, 0.0 )) / inputSize ).rgb;

  // get output pixel
  vec3 colOut = vec3( 0.0 );
  if( mod( gl_FragCoord.x, 2.0 ) < 1.0 ){

    // upscale LLCR
    colOut = vec3(
      dot( k0, vec4( srcTexL2[0], srcTexL1[0], srcTexC[0], srcTexR1[0] )),
      dot( k0, vec4( srcTexL2[1], srcTexL1[1], srcTexC[1], srcTexR1[1] )),
      dot( k0, vec4( srcTexL2[2], srcTexL1[2], srcTexC[2], srcTexR1[2] ))
    );

  }else{

    // upscale LCRR
    colOut = vec3(
      dot( k1, vec4( srcTexL1[0], srcTexC[0], srcTexR1[0], srcTexR2[0] )),
      dot( k1, vec4( srcTexL1[1], srcTexC[1], srcTexR1[1], srcTexR2[1] )),
      dot( k1, vec4( srcTexL1[2], srcTexC[2], srcTexR1[2], srcTexR2[2] ))
    );

  }

  // pack
  gl_FragColor = vec4( colOut, 1.0 );
}
