#version 100
precision ##float_precision## float;

uniform sampler2D textureIn;
uniform vec2 videoSize;

varying vec2 uv;

/*
textureIn is packed 4:1 of original video,in quads, (therefore x 0.5, y 0.5)
output is upscaled x2, but also packed 4:1 (therefore x 1.0, y 0.5)



The packed pixel...
    AB
    CD
will become...
    Ax Bx
    Cx Dx



For each pixel compute 2 of the packed 4 center values...
+--------+--------+--------+
|        |        |        |
|  Left  | Center |  Right |
|  A  B  |  A  B  |  A  B  |
|  C  D  |  C  D  |  C  D  |
|        |        |        |
+--------+--------+--------+



If (pixelOut.x mod 2 == 0) then...
    Ax
    Cx
else
    Bx
    Dx
end if



*/



vec2 halfPixel = vec2( -0.499999 );

vec2 inputSize  = (videoSize + halfPixel) * vec2( 0.5, 0.5 );
vec2 outputSize = (videoSize + halfPixel) * vec2( 1.0, 0.5 );

vec2 pixelTexOffset = vec2( 0.0, 0.0 );

// kernels
//vec4 k0 = vec4( 0.0, 0.25, 0.75, 0.0 ); // left kernel
//vec4 k1 = vec4( 0.0, 0.75, 0.25, 0.0 ); // right kernel
//vec4 k0 = vec4(     0.0,  2048.0, 16384.0, -2048.0 ) / 16384.0; // left kernel
//vec4 k1 = vec4( -2048.0, 16384.0,  2048.0,     0.0 ) / 16384.0; // right kernel
uniform vec4 k0;
uniform vec4 k1;



void main(){

  // get input pixels
  vec2 pixelTex = floor( uv * inputSize ) + pixelTexOffset - halfPixel;
  vec4 srcTexL = texture2D( textureIn, (pixelTex + vec2( -1.0, 0.0 )) / inputSize );
  vec4 srcTexC = texture2D( textureIn, (pixelTex + vec2(  0.0, 0.0 )) / inputSize );
  vec4 srcTexR = texture2D( textureIn, (pixelTex + vec2(  1.0, 0.0 )) / inputSize );

  // get output pixel
  vec4 colOut = vec4( 0.0 );
  if( mod( gl_FragCoord.x, 2.0 ) < 1.0 ){

    // compute AxCx
    colOut = vec4(
      dot( k0, vec4( srcTexL[0], srcTexL[1], srcTexC[0], srcTexC[1] )),
      dot( k1, vec4( srcTexL[1], srcTexC[0], srcTexC[1], srcTexR[0] )),
      dot( k0, vec4( srcTexL[2], srcTexL[3], srcTexC[2], srcTexC[3] )),
      dot( k1, vec4( srcTexL[3], srcTexC[2], srcTexC[3], srcTexR[2] ))
    );

  }else{

    // compute BxDx
    colOut = vec4(
      dot( k0, vec4( srcTexL[1], srcTexC[0], srcTexC[1], srcTexR[0] )),
      dot( k1, vec4( srcTexC[0], srcTexC[1], srcTexR[0], srcTexR[1] )),
      dot( k0, vec4( srcTexL[3], srcTexC[2], srcTexC[3], srcTexR[2] )),
      dot( k1, vec4( srcTexC[2], srcTexC[3], srcTexR[2], srcTexR[3] ))
    );

  }

  // pack
  gl_FragColor = colOut;
}
