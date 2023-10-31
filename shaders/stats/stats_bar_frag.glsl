precision highp float;

uniform sampler2D dataTexture;

varying vec2 uv;
varying vec2 tuv;
varying vec2 spacing_;

void main(){
	if(mod(gl_FragCoord.x, spacing_.x + spacing_.y) < spacing_.y) discard;

	//
	float tv = 1.0 - fract(tuv.y);

	// get texture
	vec4 colTex = texture2D( dataTexture, vec2(tuv.x, tv ));

	//
	float isNonZero = step( 0.001, colTex.r + colTex.g + colTex.b );
	colTex.a = isNonZero;

	gl_FragColor = colTex;
}
