precision highp float;

attribute vec2 aPos;
attribute vec2 aUV;

uniform vec2 viewportSize;
uniform vec2 dataTextureSize;
uniform float offset;
uniform vec2 spacing;

varying vec2 uv;
varying vec2 tuv;
varying vec2 spacing_;

void main (){

	// quad
	gl_Position = vec4( aPos, 0.0, 1.0 );

	// uv
	uv = aUV;

	//
	float scale = spacing.x + spacing.y;
	spacing_ = spacing;

	// translate uv coordinates to data coordinates
	float u = uv.y;
	float v = (uv.x - 1.0) / scale * viewportSize.x / dataTextureSize.y + 1.0;

	float tu = u;
	float tv0 = (offset + 1.0) / dataTextureSize.y;
	float tv1 = tv0 + 1.0;
	float tv = v * (tv1 - tv0) + tv0;

	// get texture
	tuv = vec2( tu, tv );
}
