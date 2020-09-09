var audioFingerprintOscillator = (function() {

    var audioCtx = null;
    var currentTime = null;
    var oscillator = null;
    var cc_output = [];
    var callback = null;
    var fingerprint = null;


    function run(cb, debug = false) {

        callback = cb;

        try {
            setup();
            oscillator.start(0);
        } catch (e) {
            if (debug) {
                throw e;
            }
        }
    }

    function setup() {
        setContext();
        currentTime = audioCtx.currentTime;
        setOscillator();

    }

    function setContext() {
        // for cross browser 
        audioCtx = new(window.AudioContext || window.webkitAudioContext);
    }

    // The OscillatorNode interface represents a periodic waveform, such as a sine wave. It is an
    function setOscillator() {
        console.log("test")
        oscillator = audioCtx.createOscillator(),
            analyser = audioCtx.createAnalyser(),
            gain = audioCtx.createGain(),
            scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
        gain.gain.value = 0; // Disable volume
        oscillator.type = "triangle"; // Set oscillator to output triangle wave
        oscillator.connect(analyser); // Connect oscillator output to analyser input
        analyser.connect(scriptProcessor); // Connect analyser output to scriptProcessor input
        scriptProcessor.connect(gain); // Connect scriptProcessor output to gain input
        gain.connect(audioCtx.destination); // Connect gain output to audiocontext destination
        scriptProcessor.onaudioprocess = function(bins) {
            bins = new Float32Array(analyser.frequencyBinCount);
            analyser.getFloatFrequencyData(bins);
            for (var i = 0; i < bins.length; i = i + 1) {
                cc_output.push(bins[i]);
            }
            //cc_output.extend(bins);
            analyser.disconnect();
            scriptProcessor.disconnect();
            gain.disconnect();
        };
        generateFingerprints()
    }

    function generateFingerprints() {
        fingerprint = cc_output.slice(0, 30).toString();
        if (typeof callback === 'function') {
            return callback(fingerprint);
        }
    }

    return {
        run: run
    };

})();


document.querySelector("#btn-osci").addEventListener("click", function() {
    audioFingerprintOscillator.run(function(fingerprint) {
        document.querySelector("#oscillator").textContent = "AUDIO FINGERPRINT OSCILLATOR = " + fingerprint
    });

});