var audioFingerprint = (function () {
	
	var context = null;
	var currentTime = null;
	var oscillator = null;
	var compressor = null;
	var fingerprint = null;
	var callback = null

	
	function run(cb, debug = false) {
		
		callback = cb;
		
		try {
			setup();
			oscillator.connect(compressor);
			compressor.connect(context.destination);
			oscillator.start(0);
			context.startRendering();
			context.oncomplete = onComplete;
		} catch (e) {
			if (debug) {
				throw e;
			}
		}
	}
	
	function setup()
	{
		setContext();
		currentTime = context.currentTime;
		setOscillator();
		setCompressor();
	}

	function setContext()
	{
		// for cross browser 
		var audioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
		context = new audioContext(1, 44100, 44100); // number of channels, length, sampleRate
	}

	 // The OscillatorNode interface represents a periodic waveform, such as a sine wave. It is an
	function setOscillator()
	{
		oscillator = context.createOscillator(); // create Oscillator node
		oscillator.type = "triangle";  // A sine wave. This is the default value. 
		// square // A square wave with a duty cycle of 0.5; that is, the signal is "high" for half of each period. // sawtooth // triangle // custom
		oscillator.frequency.setValueAtTime(10000, currentTime);  // value in hertz
	}

	/*
	The DynamicsCompressorNode interface provides a compression effect,
	which lowers the volume of the loudest parts of the signal in order to help prevent
	clipping and distortion that can occur when multiple sounds are played and multiplexed
	together at once. 
	*/
	// https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createDynamicsCompressor
	function setCompressor()
	{
		compressor = context.createDynamicsCompressor();

		setCompressorValueIfDefined('threshold', -50);
		setCompressorValueIfDefined('knee', 40);
		setCompressorValueIfDefined('ratio', 12);
		setCompressorValueIfDefined('reduction', -20);
		setCompressorValueIfDefined('attack', 0);
		setCompressorValueIfDefined('release', .25);
	}
	
// setting the value of the compressor
	function setCompressorValueIfDefined(item, value)
	{
		if (compressor[item] !== undefined && typeof compressor[item].setValueAtTime === 'function') {
			compressor[item].setValueAtTime(value, context.currentTime);
		}
	}
	
	function onComplete(event)
	{
		generateFingerprints(event);
		compressor.disconnect();
	}
	
	function generateFingerprints(event)
	{
		var output = null;
		for (var i = 4500; 5e3 > i; i++) {
			var channelData = event.renderedBuffer.getChannelData(0)[i];
			output += Math.abs(channelData);
		}
		
		fingerprint = output.toString();
		
		if (typeof callback === 'function') {
			return callback(fingerprint);
		}
	}
	
	return {
		run:run
	};
	
})();


document.querySelector("#btn").addEventListener("click", function () {
	audioFingerprint.run(function (fingerprint) {
		document.querySelector("#details").textContent = "AUDIO FINGERPRINT = " + fingerprint
	});
});