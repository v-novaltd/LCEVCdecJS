# LCEVCdecJS
V-Nova's LCEVC decoder for web 

## Introduction 


This project is V-Nova's implementation of the LCEVC (MPEG-5 Part 2) decoder for web-based playback. 


MPEG-5 Part 2 LCEVC (Low Complexity Enhancement Video Coding) is the latest standard by MPEG and ISO. It specifies an enhancement layer which, when combined with a base video encoded with a separate codec, produces an enhanced video stream. It is suitable for software processing implementation with sustainable power consumption. The enhancement stream provides new features such as: 

- Extending the compression capability of the base codec 

- Lowering encoding and decoding complexity 

- Providing a platform for additional future enhancements 

More on [MPEG-5 Part 2 LCEVC](https://www.lcevc.org/).  
## Prerequisites 

Only supported on browsers with [Media Source Extensions](https://caniuse.com/?search=media%20source%20extensions) support. 

## Player Integration 

This project is designed to work alongside an existing player rather than on its own. Since LCEVC works as an enhancement to existing codecs it works in tandem with decoders for those formats. 

Barebones implementation may be accomplished using [Media Source Extensions](https://developer.mozilla.org/en-US/docs/Web/API/MediaSource), however, we recommend using an officially supported player, such as the [Shaka Player](https://github.com/shaka-project/shaka-player) for ease of use. 
## Demos 
- [LCEVC integration with Shaka Player project]( https://shaka-player-demo.appspot.com/demo/#panel=ALL_CONTENT;panelData=LCEVC;build=uncompiled)  


## Shaka Player Integration 

LCEVC decoding support is included within the Shaka Player project from version 4.3 onwards. Therefore, if you are building Shaka Player, LCEVC support can be easily enabled by including this project and using `player.configure('lcevc.enabled', true);`. Please visit the [Shaka Player](Shaka-Player) project for more details. 

## Custom Player Integration 

We aim to support as many different players as possible. Please [contact us](https://www.v-nova.com/) if you would like to add LCEVC support to your player. 

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

## Contributing

We would love to have your contributions. Please read [Contributing guidelines](CONTRIBUTING.md) for more information on how to contribute.

* [Contributing guidelines](CONTRIBUTING.md)
* [Project structure](docs/structure.md)
* [Updating dependencies](docs/update_deps.md)
* [Testing](docs/testing.md)
* [Debugging tips](docs/debugging.md)
