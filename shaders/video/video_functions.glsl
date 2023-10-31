// Helper functions

/*
in OpenGL you can access vecs using an array index.
in WebGL this is not allowed (as it gets translated via Angle)
therefore we can use the following functions:
*/
vec4 vec44componenti( vec4 _vec, int i ){
	if( i == 0 ) return _vec.xxxx;
	if( i == 1 ) return _vec.yyyy;
	if( i == 2 ) return _vec.zzzz;
	return _vec.wwww;
}
vec4 vec44componentf( vec4 _vec, float i ){
	return
		_vec.xxxx *                  step( i, 0.5 ) +
		_vec.yyyy * step( 0.5, i ) * step( i, 1.5 ) +
		_vec.zzzz * step( 1.5, i ) * step( i, 2.5 ) +
		_vec.wwww * step( 2.5, i );
}
vec3 vec433componentf( vec4 _vecA, vec4 _vecB, vec4 _vecC, float i ){
	return
		vec3( _vecA.x, _vecB.x, _vecC.x ) *                  step( i, 0.5 ) +
		vec3( _vecA.y, _vecB.y, _vecC.y ) * step( 0.5, i ) * step( i, 1.5 ) +
		vec3( _vecA.z, _vecB.z, _vecC.z ) * step( 1.5, i ) * step( i, 2.5 ) +
		vec3( _vecA.w, _vecB.w, _vecC.w ) * step( 2.5, i );
}
vec4 vec444componentf( vec4 _vecA, vec4 _vecB, vec4 _vecC, vec4 _vecD, float i ){
	return
		vec4( _vecA.x, _vecB.x, _vecC.x, _vecD.x ) *                  step( i, 0.5 ) +
		vec4( _vecA.y, _vecB.y, _vecC.y, _vecD.y ) * step( 0.5, i ) * step( i, 1.5 ) +
		vec4( _vecA.z, _vecB.z, _vecC.z, _vecD.z ) * step( 1.5, i ) * step( i, 2.5 ) +
		vec4( _vecA.w, _vecB.w, _vecC.w, _vecD.w ) * step( 2.5, i );
}




/*
These functions use different values depending on the colorspace of the
browser. By default BT601 is used.
*/

uniform mat4 colorSpace_RGBYUV;
uniform mat4 colorSpace_YUVRGB;

vec3 RGBtoYUV(vec3 col){
  float Y = colorSpace_RGBYUV[0][0] * col.r + colorSpace_RGBYUV[1][0] * col.g + colorSpace_RGBYUV[2][0] * col.b + (colorSpace_RGBYUV[3][0]/255.0);
  float U = colorSpace_RGBYUV[0][1] * col.r + colorSpace_RGBYUV[1][1] * col.g + colorSpace_RGBYUV[2][1] * col.b + (colorSpace_RGBYUV[3][1]/255.0);
  float V = colorSpace_RGBYUV[0][2] * col.r + colorSpace_RGBYUV[1][2] * col.g + colorSpace_RGBYUV[2][2] * col.b + (colorSpace_RGBYUV[3][2]/255.0);
  return vec3(Y,U,V);
}

float RGBtoY(vec3 col){
  float Y = colorSpace_RGBYUV[0][0] * col.r + colorSpace_RGBYUV[1][0] * col.g + colorSpace_RGBYUV[2][0] * col.b + (colorSpace_RGBYUV[3][0]/255.0);
  return Y;
}

float RGBtoU(vec3 col){
  float U = colorSpace_RGBYUV[0][1] * col.r + colorSpace_RGBYUV[1][1] * col.g + colorSpace_RGBYUV[2][1] * col.b + (colorSpace_RGBYUV[3][1]/255.0);
  return U;
}

float RGBtoV(vec3 col){
  float V = colorSpace_RGBYUV[0][2] * col.r + colorSpace_RGBYUV[1][2] * col.g + colorSpace_RGBYUV[2][2] * col.b + (colorSpace_RGBYUV[3][2]/255.0);
  return V;
}

vec3 YUVtoRGB(vec3 col){
  float Y = col.x - (colorSpace_YUVRGB[3][0]/255.0);
  float U = col.y - (colorSpace_YUVRGB[3][1]/255.0);
  float V = col.z - (colorSpace_YUVRGB[3][2]/255.0);
  float R = colorSpace_YUVRGB[0][0] * Y + colorSpace_YUVRGB[1][0] * U + colorSpace_YUVRGB[2][0] * V;
  float G = colorSpace_YUVRGB[0][1] * Y + colorSpace_YUVRGB[1][1] * U + colorSpace_YUVRGB[2][1] * V;
  float B = colorSpace_YUVRGB[0][2] * Y + colorSpace_YUVRGB[1][2] * U + colorSpace_YUVRGB[2][2] * V;
  return vec3(R,G,B);
}


// generic random noise function
float generateNoise(vec2 coord, float seed){
  return fract(sin(dot(coord.xy , vec2(12.9898,78.233))) * seed * 8.5453);
}



float residualFloat( float component ){
  float k = floor(component * 255.0);
  return (k - step( 127.5, k ) * 256.0) * 2.0 / 255.0;
}

vec4 residualVec4( vec4 component ){
  vec4 k = floor(component * 255.0);
  return (k - step( 127.5, k ) * 256.0) * 2.0 / 255.0;
}
