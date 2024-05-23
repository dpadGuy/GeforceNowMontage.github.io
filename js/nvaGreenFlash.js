var nvaGreenFlashLength = 750;

function setupGreenFlash(nStartTime, nWidth, nHeight)
{
    logIt('setupCSSAnimation - nvaGreenFlash @ ' + nStartTime + ' for .75 seconds');

    setTimeout(function() {
        let objCSSAnimation = document.getElementById("nvaGreenFlash");

        objCSSAnimation.style.width = "" + nWidth + "px";
        objCSSAnimation.style.height = "" + nHeight + "px";

        // Start compositing
        setCompositing(true);

        // Attach CSS Keyframes to DIV container
        objCSSAnimation.style.animationName = "nvaGreenFlash";
        objCSSAnimation.style.animationDuration = ".75s";
        objCSSAnimation.style.animationDelay = nStartTime;
        objCSSAnimation.style.animationTimingFunction = "linear";

        setTimeout(function() {
            // Stop compositing
            setCompositing(false);
        }, nvaGreenFlashLength);
    }, nStartTime)
}