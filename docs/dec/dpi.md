# DPI

The DPI initialise the WebGL context, the shaders and the DPI pointer. It also
parse LCEVC data using the DPI.

## Parsing LCEVC

There are two ways to parse LCEVC data that are show in detail in the next
sections.

### Continuously

The continiuous way of parsing LCEVC data is used when the video is playing
and the last frame had LCEVC data.

LCEVC data needs to be parsed without missing frames, so this function will
check if some LCEVC data was not parsed and parse it before parsing the
one from the current time. This will maintaing the chain unbroken for
the temporal buffer.

### From a key frame

The key frame way of parsing LCEVC data is used when no LCEVC data has yet
parsed or to parse the last key frame.

LCEVC data needs to parse a keyframe in order to parse a regular one. So,
when losing LCEVC, this functions needs to be call until it finds one.

The function will cover a range of segments from the current one at the
given time in order to find one. It will start at the passed time and it will
iterate the LCEVC data until it finds one or it hit the last one of the
specified range.
