# Residual Store

The residual store class store the LCEVC (residual) data.

When the Demuxer worker finds LCEVC data and send it back to the LCEVCdec
module, this is added to this class.

Each residual is represented as a group with holds the start (PTS) and end (CTS)
time, level/profile/quality, if it is a keyframe and the actual LCEVC data.
They are called "group".

This groups are stored inside of segments that represents one second of time.
For example, it will have one segment for groups from 0 to 1, another for 1 to
2 and so on. In those segment the groups are stored unordered, but the index
of them are stored in order, so we can access then in constant time.

## Adding residuals

For adding a new residual, first it calculates the segment index where it is
going to be added. So, the segments represent a second of time, so, by dividing
the timestamp by the segment size we will get the index where it should be.

Then, it creates a new group with the data and it store the index of this
group in order in the index group of the segment. For this, a binary search
is used to insert it in O(N * log (N)) time (being N the index groups size).

The residual data covers a time interval, so when it is added this data maybe
can overlap another ones, so it needs to modify the start and end time of the
overlaping ones in order to maintain the integrity. Also, it can happen that
the can be at two segments if the start time is in one and the end time in
another.

If the residual is a key frame, the group index is added to the key frames
indexes of the segment.
