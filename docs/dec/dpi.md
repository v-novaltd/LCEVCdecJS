# DPI

The DPI initialises the WebGL context, the shaders and the DPI pointer. It also
parses LCEVC data using the DPI.

## Parsing LCEVC

There are two ways to parse LCEVC data that are shown in detail in the next
sections.

### Continuously

The continiuous way of parsing LCEVC data is used when the video is playing
and the last frame has LCEVC data.

LCEVC data needs to be parsed without missing frames, so this function will
check if any prior LCEVC data was not parsed and parse that data before moving
to the current time. This will maintain an unbroken chain for
the temporal buffer.

### From a key frame

The key frame way of parsing LCEVC data is used to parse the last key frame
or when no LCEVC data has yet been parsed.

LCEVC data needs to parse a key frame in order to parse regular frames so,
when losing LCEVC data, this functions needs to be called until a key frame is found.

The function will cover a range of segments in order to find a key frame;
from a given time to the current frame. It will start at the earliest time, 
iterating through the LCEVC data until it finds a key frame or hits the last frame of the
specified range.
