# Queue

The queue stores frames to be rendered. Decoding frames adds an
overhead, so it is hard to decode on the fly. Using a queue makes it possible
to decode frames asynchronously while rendering.

The queue can store a static number of frames, which by default is set to 10. Once
a queued frame is no longer needed, the frame is reset and set
for reuse. This is due to slow garbage collection in JavaScript.

## Input frame

The `input frame` function is asynchronous. In the next diagram we can see
what it does:

![alt text](assets/input_frame.png "Input frame")

First the function gets an empty frame from the queue, either a new frame or a frame that 
has been reset. If the queue is full no new frames can be added, attempted additions will
fail. If an empty frame is received, the frame captures the video as a texture.

The funtion then tries to parse LCEVC data for the current timestamp of the video. If
LCEVC is found, it decodes the LoQ0 and LoQ1 as a texture if they are needed.
If no LCEVC is found, it skips the previous step.

Finally, the frame is rendered using the selected shader. This last step is
explained in depth at [the renderer document](renderer.md#PresentFrame)

## Update queue

Before presenting a frame `update queue` needs to be called. This function
selects the next frame from the queue to be presented when the `present frame` 
function is called. The `update queue` function will also reset and set for reuse 
the old or no longer needed frames.

In the next diagram we can see steps done by the function:

![alt text](assets/update_queue.png "Update queue")

First, the function iterates through the frames on the queue, collecting the
obsolete frames to store for resetting. It will then select the oldest frame
out of the frames that are suitable for rendering and set that frame as the current
frame to be presented.

At the end, all the old frames are reset and set for reuse.

## Present frame

Present frame gets the index of the current frame, which was set when
`update queue` was called. This index is used to display the frame. In the following
diagram we can see what it does:

![alt text](assets/present_frame.png "Present frame")

The `present frame` function gets the frame selected to be rendered. The canvas size 
is changed to match the frame size. If `renderAtDisplaySize` is
set to `true` and the canvas size is smaller than the frame size, it will use
the width of the canvas size and it will calculate the height using the
aspect ratio of the frame. This is done to improve the GPU performance and avoid supersampling.

Finally, call [render to screen](renderer.md#RenderToScreen) so the Renderer
displays the frame on the canvas.

This function can be called when passing a frame and it will use that frame instead of
the one that is selected to be displayed.
