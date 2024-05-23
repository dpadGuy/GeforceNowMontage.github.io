// FLAGS and LOCALS
let simulator = false;

// CONSTS for xCodeParams
const sMonikerClip = "inputFile";
const sMonikerNullVideo = "inputFileNullVideo";
const sFilenameNullVideo = "/media/videos/nullvideo.mp4";

// CONSTS for CEFQuery
const sCEFSetPainting = 'QUERY_OSC_SET_PAINTING';
const sCEFIPCExtensionMsg = 'QUERY_IPC_EXTENSION_MESSAGE';
const sCEFReadSharedStorage = 'QUERY_READ_SHARED_STORAGE';
const sCEFWriteSharedStorage = 'QUERY_WRITE_SHARED_STORAGE';
const sCEFWinCloseOSC = 'QUERY_WIN_CLOSE_OSC';

// CONSTS for aspect ratios and resolutions
const sAspectRatio16x9 = '16:9';    // 1920 x 1080
const sAspectRatio16x10 = '16:10';  // 1920 x 1200
const nWidth16x9 = 1920;
const nWidth16x10 = 1920;
const nHeight16x9 = 1080;
const nHeight16x10 = 1200;

// Data structure to control flags and store computed values
var nvUtils = {
    flags: {
        wantDebug: true,
        wantBranding: true,
        wantUserVideos: true,
        wantTransitions: true,
        wantCelebration: true
    },
    computed: {
        animation: {
            nvaBrandStart: 0,
            nvaCelebrationStart: 0
        },
        aspectRatio: sAspectRatio16x9,
        outputResolution: {
            width: 0,
            height: 0
        },
        videos: {
            clipResolutionCounts: {
                "1920x1080": 0, // 16:9
                "1366x768": 0,  // 16:9
                "1280x720": 0,  // 16:9
                "1920x1200": 0, // 16:10
                "1680x1050": 0, // 16:10
                "1440x900": 0,  // 16:10
                "1280x800": 0,  // 16:10
                "unsupported":0
            }
        },
        transitions: {
            clipMarkers: []
        },
        compositing: {
            refCount: 0
        }
    }
};

//
// TODO: Remove NONE and instead update rest of code to set flag for celebration if none was sent from UI
//
// Mapping between internal celebration names and their JS-based animation data variable
var nvaCelebrationMap = {
    threeStars: { data16x9: nvaThreeStars16x9, data16x10: nvaThreeStars16x10, len: nvaThreeStarsLength },
    onTarget: { data16x9: nvaOnTarget16x9, data16x10: nvaOnTarget16x10, len: nvaOnTargetLength }
};

// Write to console.log with date/time stamp based on flag
function logIt(sLogOutput) {
    var ts = new Date();

    if (nvUtils.flags.wantDebug == true)
        console.log('[' + ts.toLocaleString() + '] ' + sLogOutput);
}

// Manages when compositing is on/off; called twice for every animation sequence
function setCompositing(enableFlag) {
    if (enableFlag) {
        // Turn on compositing
        cefQuery({
            request: JSON.stringify({
                command: sCEFSetPainting,
                enablePainting: true
            })
        });

        // Bump reference count
        nvUtils.computed.compositing.refCount += 1;
    } else {
        // Check to see if last animation has ended
        if (nvUtils.computed.compositing.refCount - 1 == 0) {
            // Turn off compositing to optimize transcoder performance
            cefQuery({
                request: JSON.stringify({
                    command: sCEFSetPainting,
                    enablePainting: false
                })
            });

            // Reset reference count
            nvUtils.computed.compositing.refCount = 0;
        } else {
            // Decrement reference count but don't turn off compositing
            nvUtils.computed.compositing.refCount--;
        }
    }

    logIt('setCompositing to ' + enableFlag + ', nvUtils.computed.compositing.refCount == ' + nvUtils.computed.compositing.refCount);
}

// ***
// *** DEPRECATED. PLEASE DO NOT REMOVE AS WE MAY WANT THIS BACK LATER ***
// ***
// Sets CSS animation properties on an object
//function setCSSAnimation(sObjID, sAnimProps, nAnimLength) {
//    var objItem = document.getElementById(sObjID);
//
//    if (objItem != null) {
//        // Set animation properties; duration is in milliseconds
//        objItem.style.animation = sAnimProps + ' ' + nAnimLength + 'ms';
//
//        // Turn on compositing, and set callback based on animation length
//        // This improves end-to-end performance of the transcode step
//        setCompositing(true);
//        setTimeout(function() { setCompositing(false); }, nAnimLength);
//
//        logIt('Inside setAnimation: ' + sObjID + ' / ' + sAnimProps + ' / ' + nAnimLength);
//    } else {
//        logIt('INVALID setAnimation: ' + sObjID);
//    }
//}

// Loads systeminfo and converts to object
function readSystemInfo(callback1, callback2) {
    // This typically takes about 2.5 secs, so commenting it out till it's actually required
    // var objResult = {};
    // cefQuery({
    //     request: JSON.stringify({
    //         command: sCEFIPCExtensionMsg,
    //         system: 'CrimsonNative',
    //         module: 'SystemInfo',
    //         method: 'GetSystemInfo',
    //         payload: {}
    //     }),
    //     onSuccess: function(response) {
    //         objResult = JSON.parse(response);
    //         callback1(objResult, callback2);
    //     },
    //     onFailure: function(errCode, errMsg) {
    //         logIt('[E] readSystemInfo - ' + errCode + ' ' + errMsg);
    //     }
    // });

    // if (simulator) {
    //     callback1(systemInfoSim, callback2);
    // }
    callback1({}, callback2);
}

// Loads recipe parameters and converts to an object
function readRecipe(systemInfo, callback) {
    var objResult = [''];
    var recipeParams = ['recipeParams'];

    // Read from sharedstorage.json
    cefQuery({
        request: JSON.stringify({
            command: sCEFReadSharedStorage,
            path: recipeParams
        }),
        onSuccess: function(response) {
            objResult = JSON.parse(response);
            var tmp = objResult.mediaDirNvidia.replace(/\\/g, '\/');
            objResult.mediaDirNvidia = tmp;
            callback(systemInfo, objResult);
        },
        onFailure: function(errCode, errMsg) {
            logIt('[E] readRecipe - ' + errCode + ' ' + errMsg);
        }
    });

    if (simulator) {
        var tmp = recipeParamsSim.mediaDirNvidia.replace(/\\/g, '\/');
        recipeParamsSim.mediaDirNvidia = tmp;
        callback(systemInfo, recipeParamsSim);
    }
}

// Writes xcodeParams to sharedstorage.json for use by transcoder
function writeTranscoder(sDataToWrite) {
    var pathParams = ['xcodeParams'];

    // Save complete transcoder input to pathParams in sharedstorage.json
    cefQuery({
        request: JSON.stringify({
            command: sCEFWriteSharedStorage,
            path: pathParams,
            data: sDataToWrite
        }),
        onSuccess: function(response) {
            logIt('Write to sharedstorage.json succeeded');

            switch(nvUtils.computed.aspectRatio)
            {
                case sAspectRatio16x9:
                    cefQuery({
                        request: JSON.stringify({
                            command: sCEFWinCloseOSC,
                            width: nWidth16x9,
                            height: nHeight16x9
                        })
                    });
                    logIt('After QUERY_WIN_CLOSE_OSC at ' + nWidth16x9 + 'x' + nHeight16x9);
                    break;

                case sAspectRatio16x10:
                    cefQuery({
                        request: JSON.stringify({
                            command: sCEFWinCloseOSC,
                            width: nWidth16x10,
                            height: nHeight16x10
                        })
                    });
                    logIt('After QUERY_WIN_CLOSE_OSC at ' + nWidth16x10 + 'x' + nHeight16x10);
                    break;
            }
        },
        onFailure: function(errCode, errMsg) {
            logIt('[E] writeTranscoder - ' + errCode + ' ' + errMsg);
        }
    });
}

// Creates data structure for the INPUTS section of xcodeParams
function buildInputsSection(dataInput, oResult) {
    let sOutput = [];
    let insertPos = 0;
    let nTotalLength = 0;
    let nNullVideoCount = 0;

    logIt('<<< Inside buildInputsSection() >>>');

    // Start with required entry so that transcoder knows to composite the 2D layer
    sOutput[insertPos++] = { name: 'animationscript', filename: 'nvuniversal.html' };

    logIt('Adding animation script entry...');

    // Only titleBasic is supported for MVP.
    if (dataInput.storyboard.titleSequence.seqType == "titleBasic")
    {
        // Include nullvideo.mp4 to generate black frames as background for compositing 2D animation
        sOutput[insertPos++] = {
            name: sMonikerNullVideo + nNullVideoCount++,
            filename: dataInput.mediaDirNvidia + sFilenameNullVideo
        }
        nTotalLength += nvaTitleBasicLength;

        logIt('Adding nullvideo.mp4 for Title Basic to xCodeParams.[Inputs]');
    }

    if (nvUtils.flags.wantUserVideos)
    {
        // Dynamically add all input files (video / audio) the user selected
        for (let i = 0; i < dataInput.inputs.length; i++) {
            sOutput[insertPos] = { name: sMonikerClip + i, filename: dataInput.inputs[i].details.path };
            nTotalLength += dataInput.inputs[i].details.duration;

            logIt('Processed clip ' + i + ': ' + dataInput.inputs[i].details.path + ', length is ' + nTotalLength);

            // Increment insertPos since we added a clip
            insertPos++;
        }
    }

    if (nvUtils.flags.wantCelebration)
    {
        // Lookup length of specific celebration
        let nLenCelebration = nvaCelebrationMap[dataInput.storyboard.celebration].len;

        // Include nullvideo.mp4 to generate black frames as background for compositing 2D animation
        sOutput[insertPos++] = {
            name: sMonikerNullVideo + nNullVideoCount++,
            filename: dataInput.mediaDirNvidia + sFilenameNullVideo
        }
        nTotalLength += nvaGreenFlashLength + nLenCelebration;

        logIt('Adding nullvideo.mp4 for Green Flash + Celebration to xCodeParams.[Inputs]');
    }

    if (nvUtils.flags.wantBranding)
    {
        // Include nullvideo.mp4 to generate black frames as background for compositing 2D animation
        sOutput[insertPos++] = {
            name: sMonikerNullVideo + nNullVideoCount++,
            filename: dataInput.mediaDirNvidia + sFilenameNullVideo
        }

        nTotalLength += nvaBrandShortLength;

        logIt('Adding nullvideo.mp4 for Branding Sequence (atEnd) to Inputs');
    }

    // Finalize object
    oResult.sInputs = sOutput;
    oResult.nTotalLength = nTotalLength;
}

// Creates data structure for the COMMANDS section of xcodeParams
function buildCommandsSection(dataInput, oResult) {
    let sOutput = [];
    let insertPos = 0;
    let nTotalLength = 0;
    let nNullVideoCount = 0;

    logIt('<<< Inside buildCommandsSection() >>>');
    logIt('Need to process ' + dataInput.inputs.length + ' inputs')

    // Start with required entry so that transcoder knows to composite the 2D layer
    sOutput[insertPos++] = { commandType: 'add', inputName: 'animationscript', inputTimeStamp: 0, outputTimeStamp: 0 };

    // Only titleBasic is supported for MVP.
    if (dataInput.storyboard.titleSequence.seqType == "titleBasic")
    {
        logIt('Setting TitleBasic aspect ratio to ' + nvUtils.computed.aspectRatio);

        // Update JSON data for SVG with values sent from UI
        nvaTitleBasicSetup(dataInput.storyboard.titleSequence.seqDetails.txtTitle,
            dataInput.storyboard.titleSequence.seqDetails.txtSubtitle, nvUtils.computed.aspectRatio);

        // Include nullvideo.mp4 to generate black frames as background for compositing 2D animation
        sOutput[insertPos] =
        {
            commandType: 'add',
            inputName: sMonikerNullVideo + nNullVideoCount,
            inputTimeStamp: 0,
            outputTimeStamp: nTotalLength,
            duration: nvaTitleBasicLength
        };
        nTotalLength += nvaTitleBasicLength;
        insertPos++;
        nNullVideoCount++;

        logIt('Adding nullvideo.mp4 for Title Sequence to Commands');
    }

    if (nvUtils.flags.wantUserVideos)
    {
        // DYNAMICALLY ADD ALL ITEMS FROM dataInput
        for (let i = 0; i < dataInput.inputs.length; i++)
        {
            sOutput[insertPos] =
            {
                commandType: 'add',
                inputName: sMonikerClip + i,
                inputTimeStamp: 0,
                outputTimeStamp: nTotalLength,
                duration: dataInput.inputs[i].details.duration
            };
            nTotalLength += dataInput.inputs[i].details.duration;

            // Track when each user video ends
            if (nvUtils.flags.wantTransitions)
                nvUtils.computed.transitions.clipMarkers[i] = nTotalLength;

            insertPos++;
        }
    }

    if (nvUtils.flags.wantCelebration)
    {
        // Lookup length of specific celebration
        let nLenCelebration = nvaCelebrationMap[dataInput.storyboard.celebration].len;

        // Include nullvideo.mp4 to generate black frames as background for compositing 2D animation
        sOutput[insertPos] =
        {
            commandType: 'add',
            inputName: sMonikerNullVideo + nNullVideoCount,
            inputTimeStamp: 0,
            outputTimeStamp: nTotalLength,
            duration: nvaGreenFlashLength + nLenCelebration
        };

        logIt('Adding ' + sOutput[insertPos].duration + ' seconds of nullvideo.mp4 for Green Flash & ' + dataInput.storyboard.celebration + ' celebration to Commands');

        // Bump everything by the appropriate value
        nTotalLength += sOutput[insertPos++].duration;
        nNullVideoCount++;

    }

    if (nvUtils.flags.wantBranding)
    {
        // Include nullvideo.mp4 to generate black frames as background for compositing 2D animation
        sOutput[insertPos] =
        {
            commandType: 'add',
            inputName: sMonikerNullVideo + nNullVideoCount,
            inputTimeStamp: 0,
            outputTimeStamp: nTotalLength,
            duration: nvaBrandShortLength
        };

        nvUtils.computed.animation.nvaBrandStart = nTotalLength;
        nTotalLength += nvaBrandShortLength;
        insertPos++;
        nNullVideoCount++;

        logIt('Adding nullvideo.mp4 for Branding Sequence (atEnd) to Commands');
    }

    // Finalize object
    oResult.sCommands = sOutput;
}

// Creates data structure for the OUTPUT section of xcodeParams
function buildOutputSection(dataInput, oResult, numLength) {
    let oOutput = {};

    logIt('<<< Inside buildOutputSection() >>>');

    oOutput = {
        filename: dataInput.output,
        inputType: 'videoAndAudio',
        videoCodec: 'H264',
        audioCodec: 'AAC',
        duration: numLength,
        width: nvUtils.computed.outputResolution.width,
        height: nvUtils.computed.outputResolution.height,
        fps: '60',
        samplingRate: 48000,
        bitRateKb: 35000,
        bitsPerSample: 8,
        audioChannels: 'stereo'
    };

    logIt('Montage output is: ' + oOutput.width + ' x ' + oOutput.height + ' @ ' + oOutput.fps + ' FPS for ' + oOutput.duration + ' seconds');
    
    // Finalize object
    oResult.sOutput = oOutput;
}

// Determines the aspect ratio and output resolution given all video inputs
function setAspectRatioAndResolution(dataInput)
{
    // Default to largest supported resolution
    let nOutputResolutionWidth = 1920;
    let nOutputResolutionHeight = 1200;

    logIt('<<< Inside setAspectRatioAndResolution() >>>');

    if (nvUtils.flags.wantUserVideos)
    {
        // Decide smallest resolution using height
        for (let i = 0; i < dataInput.inputs.length; i++)
        {
            logIt('Examining video #' + (i+1) + ' - ' + dataInput.inputs[i].details.width + ' x ' + dataInput.inputs[i].details.height);

            // If height of current video is shorter than last known shortest height, save this one
            if (dataInput.inputs[i].details.height < nOutputResolutionHeight)
            {
                logIt('Storing NEW smallest video - ' + dataInput.inputs[i].details.width + ' x ' + dataInput.inputs[i].details.height);

                nOutputResolutionWidth = dataInput.inputs[i].details.width;
                nOutputResolutionHeight = dataInput.inputs[i].details.height;
            }

            // If width of the current video is not as wide, save that too
            if (dataInput.inputs[i].details.width < nOutputResolutionWidth)
            {
                logIt('Found NEW smallest video - ' + dataInput.inputs[i].details.width + ' x ' + dataInput.inputs[i].details.height);

                nOutputResolutionWidth = dataInput.inputs[i].details.width;
            }
        }

        // Save smallest resolution as output resolution
        nvUtils.computed.outputResolution.width = nOutputResolutionWidth;
        nvUtils.computed.outputResolution.height = nOutputResolutionHeight;

        // Determine the asepect ratio
        let nAspectRatio = nOutputResolutionWidth / nOutputResolutionHeight;

        logIt('Computed nAspectRatio = ' + nAspectRatio + ' and toFixed(1) = ' + nAspectRatio.toFixed(1));

        if (nAspectRatio.toFixed(1) == 1.6)
        {
            nvUtils.computed.aspectRatio = sAspectRatio16x10;
        }
        else if(nAspectRatio.toFixed(1) == 1.7)
        {
            nvUtils.computed.aspectRatio = sAspectRatio16x9;
        }

        logIt('Using ' + nOutputResolutionWidth + ' x ' + nOutputResolutionHeight + ' (' + nvUtils.computed.aspectRatio + ') resolution for this montage');
    }
}

// ***** DO NOT REMOVE - DO NOT REMOVE - DO NO REMOVE - DO NOT REMOVE *****
// Determines the aspect ratio and output resolution given all video inputs
// function setAspectRatioAndResolutionOld(dataInput) {
//     let n16x9Count = 0;
//     let n16x10Count = 0;
//     let nUnsupportedCount = 0;
//     let nOutputResolutionWidth = 0;
//     let nOutputResolutionHeight= 0;
// 
//     logIt('<<< Inside setAspectRatioAndResolution() >>>');
// 
//     if (nvUtils.flags.wantUserVideos)
//     {
//         // Count number of videos at each resolution
//         for (let i = 0; i < dataInput.inputs.length; i++)
//         {
//             let clipResolution = dataInput.inputs[i].details.width + "x" + dataInput.inputs[i].details.height;
// 
//             if(typeof nvUtils.computed.videos.clipResolutionCounts[clipResolution] === 'undefined')
//             {
//                 // Increment count for all unsupported resolutions
//                 nvUtils.computed.videos.clipResolutionCounts["unsupported"] += 1;
//                 logIt('ERROR: Unsupported resolution ' + clipResolution + ' found!');
//             }
//             else
//             {
//                 // Increment count for specific resolution that is supported
//                 nvUtils.computed.videos.clipResolutionCounts[clipResolution] += 1;
//             }
//         }
// 
//         logIt('clipResolutionCounts: ' + JSON.stringify(nvUtils.computed.videos.clipResolutionCounts));
// 
//         // Count number of clips in 16:9 aspect ratio
//         n16x9Count = nvUtils.computed.videos.clipResolutionCounts["1920x1080"] +
//             nvUtils.computed.videos.clipResolutionCounts["1366x768"] +
//             nvUtils.computed.videos.clipResolutionCounts["1280x720"];
// 
//         // Count number of clips in 16:10 apsect ratio
//         n16x10Count = nvUtils.computed.videos.clipResolutionCounts["1920x1200"] +
//             nvUtils.computed.videos.clipResolutionCounts["1680x1050"] +
//             nvUtils.computed.videos.clipResolutionCounts["1440x900"] +
//             nvUtils.computed.videos.clipResolutionCounts["1280x800"];
// 
//         // Count number of clips in unsupported aspect ratios
//         nUnsupportedCount = nvUtils.computed.videos.clipResolutionCounts["unsupported"];
// 
//         logIt('aspectRatioCounts: 16x9=' + n16x9Count + ', 16:10=' + n16x10Count + ', Unsupported='+ nUnsupportedCount);
// 
//         // Decide what aspect ratio to use, preferring 16x9 in a tie
//         if (n16x9Count >= n16x10Count)
//         {
//             nvUtils.computed.aspectRatio = sAspectRatio16x9;
//             logIt('Using 1920x1080 (16:9) for 2D animations');
//         }
//         else
//         {
//             nvUtils.computed.aspectRatio = sAspectRatio16x10;
//             logIt('Using 1920x1200 (16:10) for 2D animations');
//         }
// 
//         // Decide what resolution to use, preferring the smallest one include at the computed aspect ratio
//         switch (nvUtils.computed.aspectRatio)
//         {
//             case sAspectRatio16x9:
//             {
//                 // Default to 1920x1080, then check for lower resolutions and adjust
//                 nOutputResolutionWidth = 1920;
//                 nOutputResolutionHeight = 1080;
// 
//                 // Check for the smallest 16x9 resolution first, then work up through other resolutions
//                 if (nvUtils.computed.videos.clipResolutionCounts["1280x720"] != 0)
//                 {
//                     nOutputResolutionWidth = 1280;
//                     nOutputResolutionHeight = 720;
//                 }
//                 else if (nvUtils.computed.videos.clipResolutionCounts["1366x768"] != 0)
//                 {
//                     nOutputResolutionWidth = 1366;
//                     nOutputResolutionHeight = 768;
//                 }
//             }
//             break;
// 
//             case sAspectRatio16x10:
//             {
//                 // Default to 1920x1200, then check for lower resolutions and adjust
//                 nOutputResolutionWidth = 1920;
//                 nOutputResolutionHeight = 1200;
// 
//                 // Check for the smallest 16x10 resolution first, then work up through other resolutions
//                 if (nvUtils.computed.videos.clipResolutionCounts["1280x800"] != 0)
//                 {
//                     nOutputResolutionWidth = 1280;
//                     nOutputResolutionHeight = 800;
//                 }
//                 else if (nvUtils.computed.videos.clipResolutionCounts["1440x900"] != 0)
//                 {
//                     nOutputResolutionWidth = 1440;
//                     nOutputResolutionHeight = 900;
//                 }
//                 else if (nvUtils.computed.videos.clipResolutionCounts["1680x1050"] != 0)
//                 {
//                     nOutputResolutionWidth = 1680;
//                     nOutputResolutionHeight = 1050;
//                 }
//                 else if (nvUtils.computed.videos.clipResolutionCounts["1920x1200"] != 0)
//                 {
//                     nOutputResolutionWidth = 1920;
//                     nOutputResolutionHeight = 1200;
//                 }
//             }
//             break;
// 
//             // Fall back to 1920x1080 and hope we don't need to upscale anything
//             default:
//                 nOutputResolutionWidth = 1920;
//                 nOutputResolutionHeight = 1080;
//                 break;
//         }
// 
//         logIt('Using ' + nOutputResolutionWidth + ' x ' + nOutputResolutionHeight + ' resolution for this montage');
// 
//         // Save these for later
//         nvUtils.computed.outputResolution.width = nOutputResolutionWidth;
//         nvUtils.computed.outputResolution.height = nOutputResolutionHeight;
//     }
// }

// Convert recipeParams (from UI) to xcodeParams (for transcoder)
function buildTranscoder(srcRecipeData) {
    var oResultInputs = { sInputs: '', nTotalLength: 0 };
    var oResultCommands = { sCommands: '' };
    var oResultOutput = { sOutput: '' };
    var sTranscoder = {};

    logIt('<<< Inside buildTranscoder() >>>');

    // Pre-processing to determine aspect ratio
    setAspectRatioAndResolution(srcRecipeData);

    // Build inputs
    buildInputsSection(srcRecipeData, oResultInputs);

    // Build commands
    buildCommandsSection(srcRecipeData, oResultCommands);

    // Build output
    buildOutputSection(srcRecipeData, oResultOutput, oResultInputs.nTotalLength);

    // Assemble inputs, commands, and output for xCodeParams
    sTranscoder = { inputs: oResultInputs.sInputs, commands: oResultCommands.sCommands, output: oResultOutput.sOutput };

    return sTranscoder;
}

// Read recipe, convert for transcoder, save to shared storage, generate mnontage
function xlateRecipe(systemInfo, jsonRecipe) {
    cefQuery({
        request: JSON.stringify({
            command: sCEFSetPainting,
            enablePainting: true
        })
    });

    // Prepare transcoder data and write to shared stoage
    writeTranscoder(buildTranscoder(jsonRecipe));

    // Update DOM to include animatation specifics
    startAnimation(systemInfo, jsonRecipe);
}

// Determine if we are running in the browser (simulator) or not
var cefQuery;
if (typeof cefQuery === 'undefined' || simulator) {
    cefQuery = function(request) {
        // Turning this OFF for now. Too verbose!
        // logIt(JSON.stringify(request));
        return;
    };
    nvUtils.flags.wantDebug = true;
    simulator = true;
    logIt('Simulator is enabled');
}

/* Test data for storyboard demo */
var recipeParamsSim = {
    _return_code: 0,
    _return_internal: 0,
    _return_status: 'Success',
    inputs: [
        {
            edgeLog: '',
            details: {
                path: 'C:/Users/simulator/Videos/NVIDIA/NVIDIA UGC App/Fortnite/Video1.mp4',
                duration: 4000,
                width: 1440,
                height: 900
            }
        },
        {
            edgeLog: '',
            details: {
                path: 'C:/Users/simulator/Videos/NVIDIA/NVIDIA UGC App/Fortnite/Video2.mp4',
                duration: 4000,
                width: 1680,
                height: 1050
            }
        }
    ],
    "storyboard":{
        "brandNV":{
            "brandDetails":{
                "position":"atEnd"
            },
            "brandType":"brandSliderInOnly"
        },
        "celebration": "onTarget",
        "titleSequence":{
            "seqDetails":{
                "txtSubtitle":"BY SUPER GAMER 2020",
                "txtTitle":"BEST GAMING MOMENTS"
            },
            "seqType":"titleBasic"
        }
    },
    mediaDir: 'C:/Montage/MontageMedia/',
    mediaDirNvidia: 'C:/p4/sw/share/GameEvents/Montage/v1',
    output: 'C:/Users/simulator/Temp/nvmontage.mp4',
    recipe: 'test/index.html'
};

var systemInfoSim = {
    uniqueid: 'ff6a612e-a6b8-4e77-a388-b809b26b303d',
    type: 3072,
    method: 'GetSystemInfo',
    source_system: 'CrimsonNative',
    source_module: 'SystemInfo',
    system: '',
    module: '',
    reference_uniqueid: '8eeb3aa4-7a6c-4417-848b-608e6ee9f325',
    payload: {
        Platform: 'Windows',
        SystemName: 'Predator PT515-51',
        VendorName: 'Acer',
        PhysicalMemoryCapacity: '34278133760',
        OSName: 'Microsoft Windows 10 Home',
        OSVersion: '10.0.17763',
        UserDefaultUILanguage: 'en_US',
        CPUName: 'Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz',
        ProcessorArchitecture: 'x64',
        GPU: [
            {
                LongGPUName: 'NVIDIA GeForce RTX 2080 with Max-Q Design'
            }
        ],
        Disk: [
            {
                TotalSize: '1023004372992',
                FreeSpace: '708281651200',
                MediaType: 'Fixed hard disk media'
            }
        ],
        Display: [
            {
                RefreshRate: '60',
                LogicalResolution: '2560.000000 x 1440.000000',
                PhysicalResolution: '3840 x 2160'
            }
        ],
        Network: {
            NetworkName: 'Ethernet',
            NetworkType: 'Ethernet',
            IsVPN: '1',
            IPAddress: '10.2.161.143',
            MACAddress: '00:05:9A:3C:7A:00',
            GatewayIP: '10.2.160.1',
            RouterMACAddress: '00:11:22:33:44:55',
            Fingerprint: '872b02ab234a01d9c0d6051a277cb2c24b5bde76'
        },
        NetworkType: 'Ethernet',
        NetworkName: 'Ethernet',
        HID: {},
        _return_code: 0,
        _return_status: 'Success',
        _return_internal: 0
    }
};
