var sum_buffer;
var full_buffer_hash;
var context_properties_string;
var context_properties;
var hybrid_oscillator_node = [];

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

var getClientRectsFP = function() {
    // Details: http://jcarlosnorte.com/security/2016/03/06/advanced-tor-browser-fingerprinting.html
    var elem = document.createElement('div');
    var s = elem.style;
    s.position = 'fixed';
    s.left = '3.1px';
    s.top = '2.1px';
    s.zIndex = '-100';
    s.visibility = 'hidden';
    s.fontSize = '19.123px';
    s.transformOrigin = '0.1px 0.2px 0.3px';
    s.webkitTransformOrigin = '0.1px 0.2px 0.3px';
    s.webkitTransform = 'scale(1.01123) matrix3d(0.251106, 0.0131141, 0, -0.000109893, -0.0380797, 0.349552, 0, 7.97469e-06, 0, 0, 1, 0, 575, 88, 0, 1)';
    s.transform = 'scale(1.01123) matrix3d(0.251106, 0.0131141, 0, -0.000109893, -0.0380797, 0.349552, 0, 7.97469e-06, 0, 0, 1, 0, 575, 88, 0, 1)';
    elem.innerHTML = '<h1>Sed ut perspiciatis unde</h1>pousdfnmv<b>asd<i id="target">asd</i></b>';
    document.body.appendChild(elem);

    var uuid = '';
    var rect = document.getElementById('target').getClientRects()[0];
    for (var key in rect) {
        uuid += rect[key];
    }

    if (elem.remove) elem.remove();
    return uuid;
};

async function getHybridFingerprint() {
    console.log("test")
    hybrid_oscillator_node = [];
    var audioCtx = new(window.AudioContext || window.webkitAudioContext),
        oscillator = audioCtx.createOscillator(),
        analyser = audioCtx.createAnalyser(),
        gain = audioCtx.createGain(),
        scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);

    // Create and configure compressor
    compressor = audioCtx.createDynamicsCompressor();

    compressor.threshold.setValueAtTime(-50, audioCtx.currentTime);
    compressor.knee.setValueAtTime(40, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

    gain.gain.value = 0; // Disable volume
    oscillator.type = "sine"; // Set oscillator to output triangle wave
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
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
        audiofp = JSON.stringify(hybrid_oscillator_node);
        var clientRectsFP = getClientRectsFP();
        var audio_hash = CryptoJS.SHA1(audiofp).toString();
        console.log(audio_hash, 'audio-hash');
        set_result(audio_hash, 'audio-fingerprint');
        full_buffer_hash = CryptoJS.SHA1(audiofp + clientRectsFP).toString();
        console.log(full_buffer_hash, 'hybrid-hash');
        set_result(full_buffer_hash,'hybrid-fingerprint');
    };
    oscillator.start(0);
}

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
            "components" : fp.components,
            "userAgent": fp.components.userAgent ?  fp.components.userAgent : null,
            "murmur": fp.murmur ? fp.murmur: null
        };
        console.log(fp)
        $.getJSON('https://ipapi.co/json/', function(ipData) {
            var ipString = JSON.stringify(ipData, null, 2);
            docData["IPInfo"] = JSON.parse(ipString);
            console.log(full_buffer_hash)
            // db.collection("hybrid-fingerprints").doc(full_buffer_hash).set(docData).then(function() {
            //     console.log("Document successfully written!");
            // });
        });
    });
}

function createDivs() {
    var removeElem = document.getElementById('results');
    if (removeElem) {
        removeElem.remove()
    }
    var elem = document.createElement('div');
    elem.innerHTML = '<div id="results"><h3>AudioContext properties:</h3><pre id="context-properties"></pre>' +
    '<h3>Fingerprint using hybrid of OscillatorNode/DynamicsCompressor method:</h3><pre id="hybrid-oscillator-node"></pre>...' +
    '<h3>Audio Hash Fingerprint</h3><pre id="audio-fingerprint"></pre>' +
    '<h3>Hybrid Fingerprint</h3><pre id="hybrid-fingerprint"></pre><br></div>';
    document.body.appendChild(elem);
}

function getFingerPrints() {
    createDivs()
    setTimeout(function() {
        getAudioContextProperties();
    }, 1000);
    setTimeout(async function() {

        getHybridFingerprint();
    }, 1000);
    setTimeout(function() {
        addToFirebase();
    }, 1000);
}