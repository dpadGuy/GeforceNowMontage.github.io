// This callback kicks off everything, starting with reading the system info
window.addEventListener('load', function() {
    // Set background to black, no transparency, so we can see animations
    if (simulator)
        document.body.style.background = 'rgba(20,60,100,1)';

    // Read and Translate the recipeParams found in sharedstorage.json
    readSystemInfo(readRecipe, xlateRecipe);
});

// Configure any 2D animations required to deliver the storyboard
function startAnimation(systemInfo, dataInput) {
    var objKeepAlive = document.getElementById('nvaKeepAlive');

    logIt('<<< Inside startAnimation() >>>');
    // logIt('System Info');
    // logIt(JSON.stringify(systemInfo));

    // Now we are ready to begin animating and compositing
    objKeepAlive.style.animationName = 'nvaKeepAlive';
    objKeepAlive.style.animationDuration = '1s';
    objKeepAlive.style.animationIterationCount = 'infinite';
    objKeepAlive.style.animationTimingFunction = 'linear';

    //
    // Configure timing for each animation in the storyboard, as needed
    //

    // Title (Basic)
    if (dataInput.storyboard.titleSequence.seqType == "titleBasic")
    {
        // Set animation properties based on aspect ratio
        switch (nvUtils.computed.aspectRatio)
        {
            case sAspectRatio16x9:
                setupBMAnimation('nvaTitleBasic', nvaTitleBasic16x9, 0, nvaTitleBasicLength, 0, 0, nWidth16x9, nHeight16x9);
                break;

            case sAspectRatio16x10:
                setupBMAnimation('nvaTitleBasic', nvaTitleBasic16x10, 0, nvaTitleBasicLength, 0, 0, nWidth16x10, nHeight16x10);
                break;
        }
    }

    // Transitions
    if (nvUtils.flags.wantTransitions)
    {
        logIt('nvaTransition ' + nvUtils.computed.transitions.clipMarkers);

        // How many clips where added by user?
        let numClips = nvUtils.computed.transitions.clipMarkers.length;

        // As long as the user added two or more clips...
        if (numClips >= 2)
        {
            // For every user added clip except the last one...
            for (let i = 0; i < (numClips - 1); i++)
            {
                if (nvUtils.computed.transitions.clipMarkers[i+1] != 0)
                {
                    // Set animation properties based on aspect ratio
                    switch (nvUtils.computed.aspectRatio)
                    {
                        case sAspectRatio16x9:
                            setupBMAnimation('nvaTransition', nvaIrisCircle16x9,
                                nvUtils.computed.transitions.clipMarkers[i] - (nvaIrisCircleLength / 2),
                                nvaIrisCircleLength, 0, 0, nWidth16x9, nHeight16x9);
                            break;

                        case sAspectRatio16x10:
                            setupBMAnimation('nvaTransition', nvaIrisCircle16x10,
                                nvUtils.computed.transitions.clipMarkers[i] - (nvaIrisCircleLength / 2),
                                nvaIrisCircleLength, 0, 0, nWidth16x10, nHeight16x10);
                            break;
                    }
                }
            }
        }
    }

    // Green Flash + Celebration
    if (nvUtils.flags.wantCelebration) {
        // Green Flash + Celebration, immediately after end of last clip
        let nStartGreenFlash = nvUtils.computed.transitions.clipMarkers[nvUtils.computed.transitions.clipMarkers.length - 1];
        let nCelebrationLen = nvaCelebrationMap[dataInput.storyboard.celebration].len;

        // Set animation properties based on aspect ratio
        switch (nvUtils.computed.aspectRatio)
        {
            case sAspectRatio16x9:
                setupGreenFlash(nStartGreenFlash, nWidth16x9, nHeight16x9);
                // setupParticles(nStartGreenFlash + nvaGreenFlashLength, nWidth16x9, nHeight16x9, 10000);
                setupBMAnimation('nvaCelebration', nvaCelebrationMap[dataInput.storyboard.celebration].data16x9, nStartGreenFlash + nvaGreenFlashLength, nCelebrationLen, 0, 0, nWidth16x9, nHeight16x9);
                break;

            case sAspectRatio16x10:
                setupGreenFlash(nStartGreenFlash, nWidth16x10, nHeight16x10);
                // setupParticles(nStartGreenFlash + nvaGreenFlashLength, nWidth16x10, nHeight16x10, 10000);
                setupBMAnimation('nvaCelebration', nvaCelebrationMap[dataInput.storyboard.celebration].data16x10, nStartGreenFlash + nvaGreenFlashLength, nCelebrationLen, 0, 0, nWidth16x10, nHeight16x10);
                break;
        }
    }

    // Branding (Short), atEnd
    if (nvUtils.flags.wantBranding)
    {
        // Set animation properties based on aspect ratio
        switch (nvUtils.computed.aspectRatio)
        {
            case sAspectRatio16x9:
                setupBMAnimation('nvaBrandShort', nvaBrandShort16x9, nvUtils.computed.animation.nvaBrandStart, nvaBrandShortLength, 0, 0, nWidth16x9, nHeight16x9);
                break;

            case sAspectRatio16x10:
                setupBMAnimation('nvaBrandShort', nvaBrandShort16x10, nvUtils.computed.animation.nvaBrandStart, nvaBrandShortLength, 0, 0, nWidth16x10, nHeight16x10);
                break;
        }
    }
}