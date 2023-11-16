# Testing LCEVCdec

To test LCEVCdec, use `npm run test`.

## Manual checks before a Pull Request

The following points can help to identify that everything is working as
intended:

* Play a stream for at least a minute and check that the LCEVC data is
  applied.

* Play a stream and then change the shader or toggle LCEVC. Check that the change has
  been made.

* Play a stream and then pause it and change the shader or toggle LCEVC.
  Play the stream again and check that there is no shuttering. 

* Play a stream, enable the 50/50 view, and then pause the video. Check that the paused image
  is the same as the native player.

* Play a stream and then reload it or change to another stream and play. Check that
  the playback, video controls, etc work correctly.

* Play a stream and then seek or move along the timebar multiple times. Check
  that it consistently renders the new positions of the video.

* Load a new stream and then seek or move along the timebar multiple times. Check
  that it consistently renders the new positions of the video.

* Check that the video controls are working:
  * The play button plays the video.
  * The pause button pauses the video.
  * When the video is playing the pause icon is displayed.
  * When the video is paused the play icon is displayed.
  * Backward/forward buttons move the time 10 seconds in the correct direction.
  * The timebar shows the buffered video.
  * Clicking at points along the timebar moves the time where it is clicked.
  * The fullscreen button opens the player at fullscreen.
  * While in fullscreen:
    * The fullscreen button closes the fullscreen.
    * Pressing the `Esc` key closes the fullscreen.
    * Pressing the `X` button at the middle top closes the fullscreen (only on some
      players).
  * The toggle button enables and disables LCEVC.
