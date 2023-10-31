precision highp float;

uniform sampler2D dataTexture;
uniform float viewportSize;

varying vec2 uv;
varying float time;


void main(){

	//
	float margin = 2.0 / viewportSize;

	//
	float radMin = 0.1;
	float radMax = 1.0 - margin;
	float radLim = mix( radMin, radMax - margin, time );

	// translate uv to polar coordinates
	float dx = (uv.x - 0.5) * 2.0;
	float dy = (uv.y - 0.5) * 2.0;
	float ang = atan(-dx,-dy);
	float rad = sqrt(dx*dx + dy*dy);
	float alpha = smoothstep(radMax, radMax-margin, rad);

	// discard
	if(rad > 1.0) discard;

	// translate coordinates to data coordinates
	float u = ang / 6.283185307179586 + 0.5;
	float v = rad;

	// get texture
	vec3 colTex = texture2D( dataTexture, vec2(u,v)).rgb;

	// get tint
	vec3 colTint = vec3( 0.804, 0.243, 0.204 );
	float isNonZero = step( 0.001, colTex.r + colTex.g + colTex.b );
	vec3 colFinal = mix( colTex, colTint, pow(rad,8.0) * 0.5 );

	// lines
	vec3 colLine = mix( vec3( 1.0 ), colTint, smoothstep(0.9, 1.0, time));
	float isLine = smoothstep( margin * 2.0, 0.0, abs( rad - radLim ));
	colFinal = mix( colFinal, colLine, isLine) * isNonZero;

	//
	gl_FragColor = vec4( colFinal, alpha );
}
