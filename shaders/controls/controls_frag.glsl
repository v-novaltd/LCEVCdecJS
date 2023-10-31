#version 100
precision ##float_precision## float;

uniform sampler2D textureIcons;

varying vec4 uv;
varying float state;


vec2 halfPixel = vec2( 0.499999 );

void main(){

	vec4 colPix = texture2D( textureIcons, uv.xy );
	float isPixel = colPix.a;

	//vec4 colPixelOff = vec4(1.0, 1.0, 1.0, 1.0);
	//vec4 colPixelOn  = vec4(0.39, 0.53, 0.79, 1.0);
	vec4 colEmptyOff = vec4(0.0, 0.0, 0.0, 0.0);
	vec4 colEmptyOn  = vec4(1.0, 1.0, 1.0, 0.2);

	//vec4 colPixel = mix( colPixelOff, colPixelOn, state );
	vec4 colPixel = vec4(colPix.rgb, 1.0);
	vec4 colEmpty = mix( colEmptyOff, colEmptyOn, state );
	vec4 colMix = mix( colEmpty, colPixel, isPixel );

	// out
	gl_FragColor = colMix;
}
