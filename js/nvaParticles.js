var nvaParticleColors = [ '#76b900', '#76b900', '#76b900', '#76b900', '#76b900' ];
var nvaParticleSizes = [ 10, 20, 30, 40, 50 ];
var nvaParticleList = [];
var nvaParticlesXPos = 960;
var nvaParticlesYPos = 200;
var nvaParticleCount = 0;

function setupParticles(nStartTime, nWidth, nHeight, nLength)
{
    logIt('setupParticles @ ' + nStartTime + ' for ' + nLength/1000 + ' seconds, dimensions are ' + nWidth + ' x ' + nHeight);

    setTimeout(function() {
        let objParticlesContainer = document.getElementById("nvaParticles");

        objParticlesContainer.style.width = "" + nWidth + "px";
        objParticlesContainer.style.height = "" + nHeight + "px";

        // Start compositing
        setCompositing(true);

        let id = setInterval(frame, 10);
        let cnt = 0;

        function frame() {
          if (cnt == 100) {
            clearInterval(id);
          } else {
            cnt++;
            nvaParticleCreate();
          }
        }

        //  End compositing
        setTimeout(function() {
            // Stop compositing
            setCompositing(false);
        }, nLength);
    }, nStartTime)
}

function nvaParticleCreate () {
    var oParticles = document.getElementById('nvaParticles'),
        nSize = nvaParticleSizes[Math.floor(Math.random() * nvaParticleSizes.length)],
        nColor = nvaParticleColors[Math.floor(Math.random() * nvaParticleColors.length)],
        nNegative = nSize/2,
        nSpeedHorz = Math.random() * 15,
        nSpeedUp = Math.random() * 10,
        nSpinVal = 360 * Math.random(),
        nSpinSpeed = ((12 * Math.random())) * (Math.random() <=.5 ? -1 : 1),
        nOtime,
        nTime = nOtime = (1 + (.5 * Math.random())) * 1000,
        nTop = (nvaParticlesYPos - nNegative),
        nLeft = (nvaParticlesXPos - nNegative),
        nDirection = Math.random() <=.5 ? -1 : 1 ,
        nLife = 10;

    var oParticle = document.createElement('div');

    logIt('Created particle #' + nvaParticleCount);

    oParticle.className = "nvaParticle";
    oParticle.style.height = nSize + 'px';
    oParticle.style.width = nSize + 'px';
    oParticle.style.top = nTop + 'px';
    oParticle.style.left = nLeft + 'px';
    oParticle.style.background = '' + nColor;
    oParticle.style.transform = 'rotate(' + nSpinVal + 'deg)';

    logIt(JSON.stringify(oParticle.style.height));

    oParticles.appendChild(oParticle);
    nvaParticleCount++;

    var oParticleTimer = setInterval(function () {
      nTime = nTime - nLife;
      nLeft = nLeft - (nSpeedHorz * nDirection);
      nTop = nTop - nSpeedUp;
      nSpeedUp = Math.min(nSize, nSpeedUp - 1);
      nSpinVal = nSpinVal + nSpinSpeed;

      oParticle.style.height = nSize + 'px';
      oParticle.style.width = nSize + 'px';
      oParticle.style.top = nTop + 'px';
      oParticle.style.left = nLeft + 'px';
      oParticle.style.opacity = ((nTime / nOtime)/2) + .25;
      oParticle.style.transform = 'rotate(' + nSpinVal + 'deg)';

      let nWidthMax = 0;
      let nHeightMax = 0;

      switch(nvUtils.computed.aspectRatio)
      {
          case sAspectRatio16x9:
            nWidthMax = nWidth16x9;
            nHeightMax = nHeight16x9;
            break;

          case sAspectRatio16x10:
            nWidthMax = nWidth16x10;
            nHeightMax = nHeight16x10;
            break;
      }

      if( nTime <= 0 || nLeft <= -nSize || nLeft >= nWidthMax + nSize || nTop >= mHeightMax + nSize ) {
        logIt('Removing a particle : nTime=' + nTime + ', nLeft=' + nLeft + ', nvUtils.width=' + (nvUtils.computed.outputResolution.width + nSize) + ', nTop=' + nTop + ', nvUtils.height=' + (nTop >= nvUtils.computed.outputResolution.height + nSize));
        oParticle.remove();
        nvaParticleCount--;
        clearInterval(oParticleTimer);
      }
    }, 1000 / 60);
  }
