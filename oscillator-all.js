
Array.prototype.extend = function(other_array) {
    other_array.forEach(function(v) {
        this.push(v);
    }, this);
};

function set_result(result, element_id) {
    //console.log("AudioContext Property FP:", result);
    pre = document.getElementById(element_id);
    pre.innerHTML = result;
}

function get_result(element_id) {
    pre = document.getElementById(element_id);
    return pre.innerHTML;
}

var sum_buffer;
var full_buffer_hash;
var context_properties_string;
var context_properties;
var oscillator_node = [];
var hybrid_oscillator_node = [];

async function setContext() {
    try {
        if (context = new(window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100), !context) {
            set_result("no_fp", "sum-buffer");
            sum_buffer = 0;
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
            sum_buffer = 0;
            var sha1 = CryptoJS.algo.SHA1.create();
            for (var i = 0; i < evnt.renderedBuffer.length; i++) {
                sha1.update(evnt.renderedBuffer.getChannelData(0)[i].toString());
            }
            hash = sha1.finalize();
            full_buffer_hash = hash.toString(CryptoJS.enc.Hex);
            set_result(full_buffer_hash, "full-buffer-hash");
            for (var i = 4500; 5e3 > i; i++) {
                sum_buffer += Math.abs(evnt.renderedBuffer.getChannelData(0)[i]);
            }
            set_result(sum_buffer, "sum-buffer");
            pxi_compressor.disconnect();
        }
    } catch (u) {
        sum_buffer = 0;
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

async function getAudioContextProperties() {
    try {
        var nt_vc_context = window.AudioContext || window.webkitAudioContext;
        if ("function" !== typeof nt_vc_context) context_properties = "Not available";
        else {
            var f = new nt_vc_context,
                d = f.createAnalyser();
            context_properties = a({}, f, "ac-");
            context_properties = a(context_properties, f.destination, "ac-");
            context_properties = a(context_properties, f.listener, "ac-");
            context_properties = a(context_properties, d, "an-");
            context_properties_string = window.JSON.stringify(context_properties, undefined, 2);
        }
    } catch (g) {
        context_properties = 0
    }
    set_result(context_properties_string, 'context-properties')
}

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
            oscillator_node.push(bins[i]);
        }
        //oscillator_node.extend(bins);
        analyser.disconnect();
        scriptProcessor.disconnect();
        gain.disconnect();
        set_result(oscillator_node.slice(0, 30), 'oscillator-node');
    };

    oscillator.start(0);
}

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
            hybrid_oscillator_node.push(bins[i]);
        }
        analyser.disconnect();
        scriptProcessor.disconnect();
        gain.disconnect();
        set_result(hybrid_oscillator_node.slice(0, 30), 'hybrid-oscillator-node');
    };
    oscillator.start(0);
}


function setCookie(cname,cvalue,exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires=" + d.toGMTString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";

}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

// function checkCookie() {
//     var fingerprint = getCookie("audio-fingerprint");
//     if (fingerprint != "") {
//         return true;
//     }
//     else {
//         if (fingerprint != "" && fingerprint != null) {
//             return false;
//         }
//     }
//     return false;;
// }

// if (!checkCookie()) {
//     setCookie("audio-fingerprint", full_buffer_hash, 30);
// } else {
//     cookieFingerPrint = getCookie("audio-fingerprint");
//     if (cookieFingerPrint !== full_buffer_hash) {
//         setCookie("audio-fingerprint", full_buffer_hash, 30);
//     }
// }

function getFingerPrintReport() {
    var d1 = new Date()
    return Fingerprint2.getPromise().then(function (components) {
        var murmur = Fingerprint2.x64hash128(components.map(function (pair) { return pair.value }).join(), 31)
        var d2 = new Date()
        var time = d2 - d1
        components = components.reduce((obj, item) => (obj[item.key] = item.value, obj) ,{});
        return {components , time, murmur}
    });
}

function addToFirebase() {
    if (!firebase.apps.length) {
        var app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore(app);
    }

    getFingerPrintReport().then(fp => {
        delete fp.components.plugins; // cant add the nested array to FB
        var docData = {
            "context-properties": context_properties,
            "full-buffer-hash": full_buffer_hash,
            "hybrid-oscillator-node": hybrid_oscillator_node,
            "oscillator-node": oscillator_node,
            "sum-buffer": sum_buffer,
            "components" : fp.components,
            "userAgent": fp.components.userAgent ?  fp.components.userAgent : null,
            "murmur": fp.murmur ? fp.murmur: null
        };
        console.log(fp)
        $.getJSON('https://ipapi.co/json/', function(ipData) {
            var ipString = JSON.stringify(ipData, null, 2);
            docData["IPInfo"] = JSON.parse(ipString);
            db.collection("fingerprints").doc(full_buffer_hash).set(docData).then(function() {
                console.log("Document successfully written!");
            });
        });
    });
}

function getFingerPrints() {
    setTimeout(function() {
        setContext();
    }, 0);
    setTimeout(function() {
        getAudioContextProperties();
    }, 1000);
    setTimeout(function() {
        getOscillatorNodeFingerprint();
    }, 2000);
    setTimeout(function() {
        getHybridFingerprint();
    }, 3000);
    setTimeout(function() {
        addToFirebase();
    }, 4000);
}