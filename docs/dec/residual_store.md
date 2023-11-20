# Residual Store

The residual store class stores the LCEVC (residual) data.

When the Demuxer worker finds LCEVC data and sends it back to the LCEVCdec
module, this is added to this class.

Each residual is represented with the following: the start (PTS) and end (CTS)
time, level/profile/quality, if it is a keyframe and the actual LCEVC data.
This collection is called a "group".

These groups are stored inside of segments that represents one second of time.
For example, there will be one segment for groups from 0 to 1, another for 1 to
2 and so on. In these segments, the groups are stored unordered, but the index
of them is stored in order, so they can be accessed in constant time.

## Adding residuals

To add a new residual, the segment index is calculated to determine
where it will be added. Since the segments represent a second of time, by dividing
the timestamp by the segment size we get the index where it should be.

A new group is then created with the data and the index of this
group is stored, in order in the index group of the segment. For this, a binary search
is used to insert it in O(N * log (N)) time (being N the index groups size).

The residual data covers a time interval, so when it is added this data may
overlap one another and the start and end time of the
overlapping data needs to be modified in order to maintain integrity. Also, the data may
be in two segments if the start time is in one and the end time in
another.

If the residual is a key frame, the group index is added to the key frames
index of the segment.
