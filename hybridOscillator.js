var context_properties_string;
var context_properties;
var sum_buffer;
var sum_buffer_hash;
var oscillator_hash;
var oscillator_node = [];
var hybrid_hash;
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

function getAudioContextProperties() {
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
    set_result(context_properties_string, 'context_properties')
}

function getDynamicCompressorFingerprint() {
    return new Promise( (resolve, reject) => {
        sum_buffer = 0;
        try {
            if (context = new(window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100), !context) {
                set_result("no_fp", "sum_buffer");
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
                var md5 = CryptoJS.algo.MD5.create();
                for (var i = 0; i < evnt.renderedBuffer.length; i++) {
                    md5.update(evnt.renderedBuffer.getChannelData(0)[i].toString());
                }
                hash = md5.finalize();
                sum_buffer_hash = hash.toString(CryptoJS.enc.Hex);
                console.log(sum_buffer_hash, 'sum_buffer_hash');
                set_result(sum_buffer_hash, "sum_buffer_hash");
                for (var i = 4500; 5e3 > i; i++) {
                    sum_buffer += Math.abs(evnt.renderedBuffer.getChannelData(0)[i]);
                }
                set_result(sum_buffer, "sum_buffer");
                pxi_compressor.disconnect();
                resolve();
            }
        } catch (u) {
            sum_buffer = 0
            set_result("no_fp", "sum_buffer");
            reject();
        }
    });
    
}

function getOsciallatorNodeFingerprint() {
    return new Promise(resolve => {
        oscillator_node = [];
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
    
        scriptProcessor.onaudioprocess = function (bins) {
            bins = new Float32Array(analyser.frequencyBinCount);
            analyser.getFloatFrequencyData(bins);
            for (var i = 0; i < bins.length; i = i + 1) {
                oscillator_node.push(bins[i]);
            }
            oscillator_node.extend(bins);
            analyser.disconnect();
            scriptProcessor.disconnect();
            gain.disconnect();
            audioFP = JSON.stringify(oscillator_node);
            oscillator_hash = CryptoJS.MD5(audioFP).toString();
            console.log(oscillator_hash, 'oscillator_hash');
            set_result(oscillator_node.slice(0, 30), 'oscillator_node');
            set_result(oscillator_hash, 'oscillator_hash');
            resolve();
    
        };
        oscillator.start(0);
    });
    
}

function getHybridAudioFingerprint() {
    return new Promise(resolve=> {
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
        oscillator.type = "triangle"; // Set oscillator to output triangle wave
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
            audioFP = JSON.stringify(hybrid_oscillator_node);
            hybrid_hash = CryptoJS.MD5(audioFP).toString();
            console.log(hybrid_hash, 'hybrid_hash');
            set_result(hybrid_oscillator_node.slice(0, 30), 'hybrid_oscillator_node');
            set_result(hybrid_hash, 'hybrid_hash');
            resolve();
        };
        oscillator.start(0);
    });
    
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

// function computeHash() {
//     getDynamicCompressorFingerprint(function(hash, output){
//         console.log(hash,output);
//     });


//     getHybridAudioFingerprint(function(audioFP) {
//     });
// }

function addToFirebase(audio_hash) {
    if (!firebase.apps.length) {
        var app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore(app);
    }
    var docData = {
        "audio_context_properties": context_properties,
        "sum_buffer": sum_buffer,
        "sum_buffer_hash": sum_buffer_hash,
        "oscillator_hash": oscillator_hash,
        "oscillator_node": oscillator_node,
        "hybrid_hash": hybrid_hash,
        "hybrid_oscillator_node": hybrid_oscillator_node,
    };
    if(isFingerprintjsLoaded("fingerprintjs2.js")) {
        getFingerPrintReport().then(fp => {
            delete fp.components.plugins; // cant add the nested array to FB
            docData["components"] = fp.components,
            docData["userAgent"] = fp.components.userAgent ?  fp.components.userAgent : null,
            docData["murmur"] = fp.murmur ? fp.murmur: null
        });
    }
    try {
        console.log("try");
        $.getJSON('https://ipapi.co/json/', function(ipData) {
            var ipString = JSON.stringify(ipData, null, 2);
            docData["IPInfo"] = JSON.parse(ipString);
            console.log("try2");
        });
    }
    catch {
        docData["IPInfo"] = "no-ip-info";
        console.log("cannot get the ip")
    }
    finally {
        console.log(docData);
        db.collection("final-fingerprints").doc(getCookie("audio-fingerprint")).set(docData).then(function() {
            console.log("Document successfully written!");
        });
    }
    enableDisableButton("fp_button", false);
}

function isFingerprintjsLoaded() {
    return $.getScript('fp.js') ? true : false;
}

function enableDisableButton(i, flag){
    $("#"+i).prop("hidden",flag);
}

function createDivs() {
    var removeElem = document.getElementById('results');
    if (removeElem) {
        removeElem.remove()
    }
    var elem = document.createElement('div');
    elem.innerHTML = '<div id="results"><h3>AudioContext properties:</h3><pre id="context_properties"></pre>' +
    '<h3> Sum of Buffer Values: Dynamic Compressor</h3><pre id="sum_buffer"></pre>'+
    '<h3> Hash of sum of Buffer Values: Dynamic Compressor</h3><pre id="sum_buffer_hash"></pre>'+
    '<h3>Fingerprint using OscillatorNode method:</h3><pre id="oscillator_node"></pre>...' +
    '<h3>Hash of OscillatorNode Fingerprint</h3><pre id="oscillator_hash"></pre>' +
    '<h3>Fingerprint using hybrid of OscillatorNode/DynamicsCompressor method:</h3><pre id="hybrid_oscillator_node"></pre>...' +
    '<h3>Hash of hybrid of OscillatorNode/DynamicsCompressor Fingerprint</h3><pre id="hybrid_hash"></pre><br>';
    document.body.appendChild(elem);
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

async function getFingerPrints() {
    const cookie = getCookie("audio-fingerprint");
    if (!cookie) {
        const randNum = String(Math.floor(10000 * Math.random()));
        const cookieHash =  CryptoJS.MD5(randNum).toString();
        console.log(randNum, cookieHash);
        setCookie("audio-fingerprint", cookieHash , 365);
    }
    createDivs();
    enableDisableButton("fp_button", true);
    getAudioContextProperties();
    await getDynamicCompressorFingerprint();
    await getOsciallatorNodeFingerprint();
    await getHybridAudioFingerprint();
    addToFirebase();
}