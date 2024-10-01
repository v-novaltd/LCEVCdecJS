# LCEVCdecJS
V-Nova's LCEVC decoder for web 

## About

This project is V-Nova's implementation of the LCEVC (MPEG-5 Part 2) decoder for web-based playback. To learn what the LCEVC (Low Complexity Enhancement Video Coding) codec is and how it works, please refer to the [V-Nova documentation portal](https://docs.v-nova.com/v-nova/lcevc/lcevc-sdk-overview).

## Prerequisites 

Only supported on browsers with [Media Source Extensions](https://caniuse.com/?search=media%20source%20extensions) support. 

## Player Integration 

This project is designed to work alongside any existing web player rather than on its own. Since LCEVC works as an enhancement to existing codecs it works in tandem with decoders for those formats. Within web environments, the native system decoders are typically used to decode the base video codec as an input to LCEVCdecJS to provide the LCEVC enhancement decode and rendering. 

Simple LCEVC-enhanced player implementations may also be accomplished by directly using [Media Source Extensions](https://developer.mozilla.org/en-US/docs/Web/API/MediaSource). 

## Shaka Player Integration 

LCEVC decoding support is included within the Shaka Player project from version 4.3 onwards. Therefore, if you are building Shaka Player, LCEVC support can be easily enabled by including this project and using `player.configure('lcevc.enabled', true);`. Please visit the [Shaka Player](Shaka-Player) project for more details. 

## Demos 
- [LCEVC integration with Shaka Player project]( https://shaka-player-demo.appspot.com/demo/#panel=ALL_CONTENT;panelData=LCEVC;build=uncompiled)  

## Building & Getting Started

Install the dependencies using `npm install` and build the library with `npm run build`. Run
the tests with `npm run test` to confirm that LCEVCdecJS is built succesfully. More
detailed guides are available for various environments:

* [Setting Up Build Environment](docs/setting_up.md)
* [Building LCEVCdecJS](docs/building.md)

## Documentation

Detailed documentation is available for the different parts of LCEVCdecJS:

* [LCEVCdec](docs/dec/LCEVCdec.md)
* [DPI](docs/dec/dpi.md)
* [Residual store](docs/dec/residual_store.md)
* [Queue](docs/dec/queue.md)
* [Renderer](docs/dec/renderer.md)
* [Demuxer worker](docs/dec/demuxer_worker.md)
* [Project structure](docs/structure.md)
* [Updating dependencies](docs/update_deps.md)

## Notice

Copyright (c) V-Nova International Limited 2014 - 2024
All rights reserved.

Additional Information and Restrictions

 * The LCEVCdecJS software is licensed under the BSD-3-Clause-Clear License.
 * The LCEVCdecJS software is a stand-alone project and is NOT A CONTRIBUTION to any
other project.
 * If the software is incorporated into another project, THE TERMS OF THE BSD 3-
Clause Clear License and the additional licensing information contained in this folder
MUST BE MAINTAINED, AND THE SOFTWARE DOES NOT AND MUST NOT ADOPT THE LICENSE OF THE
INCORPORATING PROJECT. However, the software may be incorporated into a project under
a compatible license provided the requirements of the BSD-3-Clause-Clear license are
respected, and V-Nova International Limited remains licensor of the software ONLY
UNDER the BSD-3-Clause-Clear license (not the compatible license).
 * ANY ONWARD DISTRIBUTION, WHETHER STAND-ALONE OR AS PART OF ANY OTHER PROJECT,
REMAINS SUBJECT TO THE EXCLUSION OF PATENT LICENSES PROVISION OF THIS
BSD-3-CLAUSE-CLEAR LICENSE. For enquiries about patent licenses, please contact
legal@v-nova.com.