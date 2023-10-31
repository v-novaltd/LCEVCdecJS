precision ##float_precision## float;

attribute vec3 aBars;

uniform vec2 dataTextureSize;
uniform float offset;

varying vec3 col;



vec3 _colHexToRGB( float hex ){
	return vec3(
		floor( hex / 65536.0 ) / 255.0,
		floor( mod( hex / 256.0, 256.0)) / 255.0,
		mod( hex, 256.0 ) / 255.0
	);
}

void main (){

	// position
	float px = aBars.x / dataTextureSize.x;
	float py = (aBars.y + offset) / dataTextureSize.y;
	float x = px * 2.0 - 1.0;
	float y = py *-2.0 + 1.0;
	gl_Position = vec4( x, y, 0.0, 1.0 );

	//
	col = _colHexToRGB(aBars.z);
}
