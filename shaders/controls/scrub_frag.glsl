#version 100
precision ##float_precision## float;

uniform float currentTime;
uniform float color;

varying vec2 uv;



vec3 _colHexToRGB( float hex ){
	return vec3(
		floor( hex / 65536.0 ) / 255.0,
		floor( mod( hex / 256.0, 256.0)) / 255.0,
		mod( hex, 256.0 ) / 255.0
	);
}

void main(){

	vec3 colBar = _colHexToRGB(color);

	//
	vec3 colEdge = vec3(1.0);
	float edge = abs(0.5 - uv.x) * 2.0;

	//
	vec3 colFinal = colBar;// + colEdge * edge * edge * 0.05;

	// out
	gl_FragColor = vec4( colFinal, 1.0 );
}

