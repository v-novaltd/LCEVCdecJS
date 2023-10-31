precision highp float;

attribute vec2 aPos;
attribute vec2 aUV;

uniform float timeRatio;

varying vec2 uv;
varying float time;

void main (){

	gl_Position = vec4( aPos, 0.0, 1.0 );

	uv = aUV;

	time = min( timeRatio, 1.0 );
}
