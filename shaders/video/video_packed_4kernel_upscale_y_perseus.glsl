#version 100
precision ##float_precision## float;

uniform sampler2D textureIn;
uniform sampler2D textureResidual;
uniform vec2 videoSize;

varying vec2 uv;

/*

Compute center pixel, using Top and Bottom pixels as inputs to kernel.



+--------+
|        |
|  Top   |
|  A  B  |
|  C  D  |
|        |
+--------+
|        |
| Center |
|  A  B  |
|  C  D  |
|        |
+--------+
|        |
|  Bot   |
|  A  B  |
|  C  D  |
|        |
+--------+




*/

##video_functions##



vec2 halfPixel = vec2( -0.49 );

vec2 inputSize    = (videoSize + halfPixel) * vec2( 1.0, 0.5 );
vec2 outputSize   = (videoSize + halfPixel) * vec2( 1.0, 1.0 );
vec2 residualSize = (videoSize + halfPixel) * vec2( 0.5, 1.0 );

vec2 offsetResiduals = vec2( 0.0, 1.0 );

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
  vec4 srcTexT = texture2D( textureIn, (pixelTex + vec2( 0.0, -1.0 )) / inputSize );
  vec4 srcTexC = texture2D( textureIn, (pixelTex + vec2( 0.0,  0.0 )) / inputSize );
  vec4 srcTexB = texture2D( textureIn, (pixelTex + vec2( 0.0,  1.0 )) / inputSize );

  // get output pixel
  vec4 colOut = vec4( 0.0 );
  if( mod( gl_FragCoord.y, 2.0 ) < 1.0 ){

    // compute AyBy (uses top half of center pixel)
    colOut = vec4(
      dot( k0, vec4( srcTexT[0], srcTexT[2], srcTexC[0], srcTexC[2] )),
      dot( k0, vec4( srcTexT[1], srcTexT[3], srcTexC[1], srcTexC[3] )),
      dot( k1, vec4( srcTexT[2], srcTexC[0], srcTexC[2], srcTexB[0] )),
      dot( k1, vec4( srcTexT[3], srcTexC[1], srcTexC[3], srcTexB[1] ))
    );

  }else{

    // compute CyDy (uses bottom half of center pixel)
    colOut = vec4(
      dot( k0, vec4( srcTexT[2], srcTexC[0], srcTexC[2], srcTexB[0] )),
      dot( k0, vec4( srcTexT[3], srcTexC[1], srcTexC[3], srcTexB[1] )),
      dot( k1, vec4( srcTexC[0], srcTexC[2], srcTexB[0], srcTexB[2] )),
      dot( k1, vec4( srcTexC[1], srcTexC[3], srcTexB[1], srcTexB[3] ))
    );

  }

  // get residual pixels
  float outX = gl_FragCoord.x - offsetResiduals.x / 2.0;
  float outY = gl_FragCoord.y - offsetResiduals.y / 2.0;
  vec4 texResidualTop = texture2D( textureResidual, vec2( outX, outY + 0.0 ) / outputSize );
  vec4 texResidualBot = texture2D( textureResidual, vec2( outX, outY + 0.5 ) / outputSize );

  // get points of quad ABCD, in top and bottom pairs AB,CD
  vec4 quad = vec4(0.0);
  if( mod( gl_FragCoord.x, 2.0 ) < 1.0 ){
    quad = vec4( texResidualTop.xy,  texResidualBot.xy );
  }else{
    quad = vec4( texResidualTop.zw,  texResidualBot.zw );
  }

  // convert quad of pixels into perseus residual values, and apply
  colOut = colOut + residualVec4( quad );

  // pack
  gl_FragColor = colOut;
}
