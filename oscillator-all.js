Array.prototype.extend = function(other_array) {
    other_array.forEach(function(v) {
        this.push(v);
    }, this);
};

function set_result(result, element_id) {
    console.log("AudioContext Property FP:", result);
    pre = document.getElementById(element_id);
    pre.innerHTML = result;
}

function get_result(element_id) {
    pre = document.getElementById(element_id);
    return pre.innerHTML;
}

// Performs fingerprint as found in https://client.a.pxi.pub/PXmssU3ZQ0/main.min.js
var pxi_output;
var pxi_full_buffer;

async function setContext() {
    try {
        if (context = new(window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100), !context) {
            set_result("no_fp", "sum-buffer");
            pxi_output = 0;
        }

        // Create oscillator
        pxi_oscillator = context.createOscillator();
        pxi_oscillator.type = "triangle";
        pxi_oscillator.frequency.value = 1e4;

        // Create and configure compressor
        pxi_compressor = context.createDynamicsCompressor();
        pxi_compressor.threshold && (pxi_compressor.threshold.value = -50);
        pxi_compressor.knee && (pxi_compressor.knee.value = 40);
        pxi_compressor.ratio && (pxi_compressor.ratio.value = 12);
        pxi_compressor.reduction && (pxi_compressor.reduction.value = -20);
        pxi_compressor.attack && (pxi_compressor.attack.value = 0);
        pxi_compressor.release && (pxi_compressor.release.value = .25);

        // Connect nodes
        pxi_oscillator.connect(pxi_compressor);
        pxi_compressor.connect(context.destination);

        // Start audio processing
        pxi_oscillator.start(0);
        context.startRendering();
        context.oncomplete = function(evnt) {
            pxi_output = 0;
            var sha1 = CryptoJS.algo.SHA1.create();
            for (var i = 0; i < evnt.renderedBuffer.length; i++) {
                sha1.update(evnt.renderedBuffer.getChannelData(0)[i].toString());
            }
            hash = sha1.finalize();
            pxi_full_buffer_hash = hash.toString(CryptoJS.enc.Hex);
            set_result(pxi_full_buffer_hash, "hash-full-buffer");
            for (var i = 4500; 5e3 > i; i++) {
                pxi_output += Math.abs(evnt.renderedBuffer.getChannelData(0)[i]);
            }
            set_result(pxi_output.toString(), "sum-buffer");
            pxi_compressor.disconnect();
        }
    } catch (u) {
        pxi_output = 0;
        set_result("no_fp", "sum-buffer");
    }
}
// End PXI fingerprint

// Performs fingerprint as found in some versions of http://metrics.nt.vc/metrics.js
function a(a, b, c) {
    for (var d in b) "dopplerFactor" === d || "speedOfSound" === d || "currentTime" ===
        d || "number" !== typeof b[d] && "string" !== typeof b[d] || (a[(c ? c : "") + d] = b[d]);
    return a
}

var nt_vc_output;

async function getAudioContextProperties() {
    try {
        var nt_vc_context = window.AudioContext || window.webkitAudioContext;
        if ("function" !== typeof nt_vc_context) nt_vc_output = "Not available";
        else {
            var f = new nt_vc_context,
                d = f.createAnalyser();
            nt_vc_output = a({}, f, "ac-");
            nt_vc_output = a(nt_vc_output, f.destination, "ac-");
            nt_vc_output = a(nt_vc_output, f.listener, "ac-");
            nt_vc_output = a(nt_vc_output, d, "an-");
            nt_vc_output = window.JSON.stringify(nt_vc_output, undefined, 2);
        }
    } catch (g) {
        nt_vc_output = 0
    }
    set_result(nt_vc_output, 'context-properties')
}

// Performs fingerprint as found in https://www.cdn-net.com/cc.js
var cc_output = [];

async function getOscillatorNodeFingerprint() {
    var audioCtx = new(window.AudioContext || window.webkitAudioContext),
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
        set_result(cc_output.slice(0, 30), 'oscillator-node');
    };

    oscillator.start(0);
}

// Performs a hybrid of cc/pxi methods found above
var hybrid_output = [];

async function getHybridFingerprint() {
    var audioCtx = new(window.AudioContext || window.webkitAudioContext),
        oscillator = audioCtx.createOscillator(),
        analyser = audioCtx.createAnalyser(),
        gain = audioCtx.createGain(),
        scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);

    // Create and configure compressor
    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold && (compressor.threshold.value = -50);
    compressor.knee && (compressor.knee.value = 40);
    compressor.ratio && (compressor.ratio.value = 12);
    compressor.reduction && (compressor.reduction.value = -20);
    compressor.attack && (compressor.attack.value = 0);
    compressor.release && (compressor.release.value = .25);

    gain.gain.value = 0; // Disable volume
    oscillator.type = "triangle"; // Set oscillator to output triangle wave
    oscillator.connect(compressor); // Connect oscillator output to dynamic compressor
    compressor.connect(analyser); // Connect compressor to analyser
    analyser.connect(scriptProcessor); // Connect analyser output to scriptProcessor input
    scriptProcessor.connect(gain); // Connect scriptProcessor output to gain input
    gain.connect(audioCtx.destination); // Connect gain output to audiocontext destination

    scriptProcessor.onaudioprocess = function(bins) {
        bins = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(bins);
        for (var i = 0; i < bins.length; i = i + 1) {
            hybrid_output.push(bins[i]);
        }
        analyser.disconnect();
        scriptProcessor.disconnect();
        gain.disconnect();
        set_result(hybrid_output.slice(0, 30), 'hybrid-oscillator-node');
        //draw_fp(bins);
    };
    oscillator.start(0);
    return new Promise((resolve, reject) => {
        console.log('Initial');
        resolve(hybrid_output.slice(0, 30));
    })
}

async function addToFirebase() {
    var app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore(app);
    var docData = {
        stringExample: "Hello world!",
        booleanExample: true,
        numberExample: 3.14159265,
        dateExample: firebase.firestore.Timestamp.fromDate(new Date("December 10, 1815")),
        arrayExample: [5, true, "hello"],
        nullExample: null,
        objectExample: {
            a: 5,
            b: {
                nested: "foo"
            }
        }
    };
    db.collection("data").doc("one").set(docData).then(function() {
        console.log("Document successfully written!");
    });

}

async function getFingerPrints() {
    await addToFirebase();
    await setContext();
    await getAudioContextProperties();
    await getOscillatorNodeFingerprint();
    await getHybridFingerprint()
}