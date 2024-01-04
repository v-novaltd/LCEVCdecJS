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
* [Residual store](docs/dec/residual_store.md.md)
* [Queue](docs/dec/queue.md)
* [Renderer](docs/dec/renderer.md)
* [Demuxer worker](docs/dec/demuxer_worker.md)
* [Project structure](docs/structure.md)
* [Updating dependencies](docs/update_deps.md)

## License

Copyright © V-Nova International Limited 2024

This software is protected by copyrights and other intellectual property rights and no license is granted to any such rights. If you would like to obtain a license to compile, distribute, or make any other use of this software, please contact V-Nova Limited info@v-nova.com.
