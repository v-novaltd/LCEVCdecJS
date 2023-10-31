# Renderer

The Renderer class uses WebGL to render the frames using different shaders and
render a frame to the screen.

## Render frame

The Queue stores the frames pre-render as textures so when they are displayed
most of the work is done. There are multiples ways of rendering a frame like
1D with LCEVC, 2D with LCEVC, base only, etc. In the following diagram we
can see the steps done by the 2D with LCEVC:

![alt text](assets/render_frame.png "Render frame")

The video texture is converted to YUV. If there is a LoQ0 texture, we merge the
video texture one with the LoQ0 one. Then it is upscale horizontally and it
is again upscale vertically but at the same time we merge the LoQ1.

The merged texture is converted back to RBG, so it can be displayed by
WebGL at the canvas.

The other ways of render a frame are mostly equal. All of them have to convert
the video texture to YUV if it is going to merge with LCEVC data, and if that
happends it needs to be converted back again to RBG.

## Render to screen

The frames are pre-render so when displaying to the screen it only needs a few
steps for doing it as we can see in the next diagram:

![alt text](assets/render_to_screen.png "Render Screen")

It sets the viewport, then binds the frame texture and the noise texture. Then
it apply the dithering and this is the final texture that it used to display
the video with LCEVC data if parsed and with the dithering.
