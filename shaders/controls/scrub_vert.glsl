precision ##float_precision## float;

attribute vec2 aChunks;

uniform vec2 canvasSize;
uniform vec4 scrubArea;
uniform vec2 timeRange;

varying vec2 uv;

void main (){

	// uv
	float index = aChunks.x;
	uv.x = floor(mod(index, 2.0));
	uv.y = floor(index / 2.0);

	// timeline position
	float t = aChunks.y;

	// get in terms of time range percent
	float tx = max(t - timeRange[0], 0.0) / (timeRange[1] - timeRange[0]);

	// get in terms of canvas pixel area
	float px = tx   * (scrubArea.z - scrubArea.x) + scrubArea.x;
	float py = uv.y * (scrubArea.w - scrubArea.y) + scrubArea.y;

	// get in terms of screen coordinate
	float x = px / canvasSize.x * 2.0 - 1.0;
	float y = py / canvasSize.y *-2.0 + 1.0;

	// position
	gl_Position = vec4(x, y, 0.0, 1.0);
}
