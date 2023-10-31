# Testing LCEVCdec

To test LCEVCdec, use `npm run test`.

## Manual checks before a Pull Request

The following points could help us to identify that everything is working as
intended:

* Play it during a minute or so. Check if the LCEVC data is
  applied.

* Play a stream, change the shader or toggle LCEVC. Check that the changes has
  been made.

* Play a stream, then pause it, change the shader or toggle LCEVC and play again.
  Check if there is not shuterring.

* Play a stream, enable the 50/50 view, pause the video. Check that paused image
  is the same as the native player.

* Play a stream, then load again or change to another and play. Check that
  anything is broken, like the playback, video controls, etc.

* Play a stream, seek or move using the timebar constantly. Check
  that it renders the new positions of the video.

* Load a stream, seek or move using the timebar constantly. Check that it
  renders the new positions of the video.

* Check that the video controls are working:
  * Play buttons plays the video.
  * Pause buttons pause the video.
  * When the video is playing the pause icon is display.
  * When the video is paused the play icon is display.
  * Backward/forward buttons move the time 10 seconds.
  * The timebar show the buffered video.
  * Clicking at the timebar move the time where it is click.
  * Fullscreen button open the player at fullscreen.
  * While in fullscreen:
    * Fullscreen button close the fullscreen.
    * Press `Esc` key close the fullscreen.
    * Press the `X` button at the middle top close the fullscreen (only on some
      players).
  * Toggle button enable and disable LCEVC.
