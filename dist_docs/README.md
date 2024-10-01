# LCEVCdec.js 
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