# LCEVCdec

The LCEVCdec class is the one that is constructed outside as LCEVCdec.

The class initialise all the module and interact with them and with the
video events.

## Experimental features.

The draft function `videoFrameCallback` is used if the browser have it. This
function call the passed function when the video has render a new frame. It
also provide some metadata info about the video. This function is helpful
to only input new frames when they are rendered.

## Main loop

Onces the LCEVCdec is created it uses `requestAnimationFrame` to run a loop. In
the following diagram we can see at the right branch what the loops does:

![alt text](assets/video_flow.png "Video flow")

If `videoFrameCallback` is not present at the browser, we get a new frame
from the video. Then the queue is updated and present the frame with the one
that has been selected when updating the queue. Then it updates the video controls, stats and DPS.

At the end, `requestAnimationFrame` is used again to call the same function.

Not having the `videoFrameCallback` makes it miss frame or try to input already
inputed frames.

## Append a buffer

In order to get LCEVC data from a video, the public function `append buffer` is
used to parse the LCEVC data.

The functions needs the buffer, the type of buffer, the level/profile/quality
and the start and end time of this buffer.

The level is only use to not render LCEVC from another level when we are playing
a different one.

The start and end time are optional, but for best result it is advisable. This
times represent the interval of time this buffer is.

All this data is send to the Demuxer worker that will find the LCEVC data and
send us message with every one of them.

## Video events

Some events of the video are listened in order to mimic the native player. This
ones are:

* loadeddata:
  * Check if the video is a live one.
  * Update the controls to reflect the previous check.
  * If poster frame is enable, render it.
* play:
  * If it is the first time, enable the queue rendering.
  * Reset the presentation time at the Queue.
  * Refresh the video controls icons.
* pause:
  * Reset the presentation time at the Queue.
  * Refresh the video controls icons.
* seeked:
  * If the queue rendering is disable, enable it to show the right frame.
  * Reset the queue.
  * If the last frame had LCEVC, clear the temporal for not show wrong
    residuals.
  * If video is paused, force to add a new frame to the queue. This is done
    because `videoFrameCallback` is asynchronous and can be call before this
    event and by reseting the queue and clearing the temporal we can miss the
    new frame or show a black one.
* render: This is a custom event used to force input a frame to the queue
  so when a change of shader or toggling LCEVC the display is updated when the
  video is paused.
* resizing: If paused, re-render again to use the proper player size.
* timeupdate: Update our internal current time of the video.

## DPS

The dynamic performance scaling or DPS checks if it is dropping lots of frames
and disable LCEVC for some time. If it is triggered again in a short period of
time, the disabled time will be higher and if it is done in three times in a row
the LCEVC will be always disable.

If when it is enable again it has pass a long period of time, the disable time
it is reset as default.

## Events

LCEVCdec triggers when there are changes at the DPS:

* PERFORMANCE_DROPPED: when the DPS is enable.
* PERFORMANCE_RESTORED: when the DPS is disable.