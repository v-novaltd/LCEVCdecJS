# Demuxer worker

The demuxer worker is in charge of finding LCEVC data in a buffer and sending it
back to LCEVCdec.

The worker processes the messages from LCEVCdec and, depending on the `id` value, acts in the following ways:

* `config`: Sets the logging level on the worker.
* `reset`: Resets the Demuxer.
* `demux`: Processes the received buffer.

## Demuxing

The message with the id `demux` contains:

* The buffer.
* The start time of the buffer.
* The end time of the buffer.
* The level/profile/quality values.
* The fragment type.

This buffer is sent to the demuxer. Different parsers will be used 
depending on the fragment type. For example, the following diagram 
shows how an `mp4` fragment is processed:

![alt text](assets/appendbuffer.png "Append buffer")

The buffer is sent to the demuxer and the header will be processed to find the
`baseMediaDecodeTime`. After this, the buffer will be appended to `mp4box.js` and 
will call the `onSample` function for every sample found. For every
sample, the CTS and PTS will be fixed using the `baseMediaDecodeTime`. Check
that the CTS and PTS are inside the `start` and `end` times of the buffer and can
find the LCEVC data. If LCEVC data is found, send it to LCEVCdec. When all the
samples are processed, the demuxer finishes and waits for more messages.
