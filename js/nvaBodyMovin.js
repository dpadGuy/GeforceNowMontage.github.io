/* Generic support for SVG animation using BodyMovin/LottiePlayer */
function setupBMAnimation(sObjName, objToAnimate, nStartTime, nLength, nLeft, nTop, nWidth, nHeight) {
    logIt('setupBMAnimation - ' + sObjName + ' @ ' + nStartTime + ' for ' + (nLength / 1000) +
            ' seconds, placed at ' + nTop + ', ' + nLeft + ' with size ' + nWidth + ' x ' + nHeight);

    // Configure animation sequences
    setTimeout(function() {
        let objBodyMovin = document.getElementById(sObjName);
        let animation = bodymovin.loadAnimation(
            {
                container: objBodyMovin,
                renderer: 'svg',
                loop: false,
                autoplay: true,
                animationData: objToAnimate
            }
        );

        // Reposition container DIV based to position / size needed by the animation
        objBodyMovin.style.left = nLeft + 'px';
        objBodyMovin.style.top = nTop + 'px';
        objBodyMovin.style.width = nWidth + 'px';
        objBodyMovin.style.height = nHeight + 'px';

        // Make the container DIV visible and animate
        objBodyMovin.style.opacity = '1.0';

        // Start compositing
        setCompositing(true);

        // Schedule end of animation
        setTimeout(function() {
            // Completely clean up the finished animation
            objBodyMovin.style.opacity = '0.0';
            animation.destroy();
            animation = null;

            // Stop compositing
            setCompositing(false);
        }, nLength);
    }, nStartTime)
}