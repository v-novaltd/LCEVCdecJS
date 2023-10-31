precision ##float_precision## float;

attribute vec2 aPos;
attribute vec2 aUV;
attribute vec2 aState;

uniform vec2 canvasSize;

varying vec4 uv;
varying float state;

void main (){

	float x = aPos.x / canvasSize.x * 2.0 - 1.0;
	float y = aPos.y / canvasSize.y *-2.0 + 1.0;
	gl_Position = vec4(x, y, 0.0, 1.0);

	uv.xy = aUV;
	float index = aState.x;
	uv.z = floor(mod(index, 2.0));
	uv.w = floor(index / 2.0);

	state = aState.y;
}
