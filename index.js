var hasConsole = typeof console !== "undefined"
var MediaDevices = [];
var isHTTPs = location.protocol === 'https:';
var hasMicrophone = false;
var hasSpeakers = false;
var hasWebcam = false;
var isMicrophoneAlreadyCaptured = false;
var isWebcamAlreadyCaptured = false;

if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
  navigator.enumerateDevices = function(callback) {
      navigator.mediaDevices.enumerateDevices().then(callback);
  };
}

function fingerprintReport() {
  var d1 = new Date()
  return Fingerprint2.getPromise().then(function (components) {
    var murmur = Fingerprint2.x64hash128(components.map(function (pair) { return pair.value }).join(), 31)
    var d2 = new Date()
    var time = d2 - d1
    return { components, time, murmur}
  });
}

function canEnumerateMediaDevice() {
  if (typeof MediaStreamTrack !== 'undefined' && 'getSources' in MediaStreamTrack) {
    canEnumerate = true;
  } else if (navigator.mediaDevices && !!navigator.mediaDevices.enumerateDevices) {
    canEnumerate = true;
  }
  return canEnumerate
}

function checkDeviceSupport(callback) {
  if (!canEnumerateMediaDevice) {
      return;
  }

  if (!navigator.enumerateDevices && window.MediaStreamTrack && window.MediaStreamTrack.getSources) {
      navigator.enumerateDevices = window.MediaStreamTrack.getSources.bind(window.MediaStreamTrack);
  }

  if (!navigator.enumerateDevices && navigator.enumerateDevices) {
      navigator.enumerateDevices = navigator.enumerateDevices.bind(navigator);
  }

  if (!navigator.enumerateDevices) {
      if (callback) {
          callback();
      }
      return;
  }

  MediaDevices = [];
  navigator.enumerateDevices(function(devices) {
      devices.forEach(function(_device) {
          var device = {};
          for (var d in _device) {
              device[d] = _device[d];
          }

          if (device.kind === 'audio') {
              device.kind = 'audioinput';
          }

          if (device.kind === 'video') {
              device.kind = 'videoinput';
          }

          var skip;
          MediaDevices.forEach(function(d) {
              if (d.id === device.id && d.kind === device.kind) {
                  skip = true;
              }
          });

          if (skip) {
              return;
          }

          if (!device.deviceId) {
              device.deviceId = device.id;
          }

          if (!device.id) {
              device.id = device.deviceId;
          }

          if (!device.label) {
              device.label = 'Please invoke getUserMedia once.';
              if (!isHTTPs) {
                  device.label = 'HTTPs is required to get label of this ' + device.kind + ' device.';
              }
          } else {
              if (device.kind === 'videoinput' && !isWebcamAlreadyCaptured) {
                  isWebcamAlreadyCaptured = true;
              }

              if (device.kind === 'audioinput' && !isMicrophoneAlreadyCaptured) {
                  isMicrophoneAlreadyCaptured = true;
              }
          }

          if (device.kind === 'audioinput') {
              hasMicrophone = true;
          }

          if (device.kind === 'audiooutput') {
              hasSpeakers = true;
          }

          if (device.kind === 'videoinput') {
              hasWebcam = true;
          }
          MediaDevices.push(device);
      });

      if (callback) {
          callback();
      }
  });
}

function showDetails(details) {
  document.querySelector("#time").textContent = details.time
  document.querySelector("#fp").textContent = details.murmur
  info = ''
  if(details.components) {
    for (var index in details.components) {
      var obj = details.components[index]
      var line = obj.key + " = " + String(obj.value).substr(0, 100)
      if (hasConsole) {
        console.log(line)
      }
      info += line + "\n"
    }
  }
  document.querySelector("#details").textContent = info
}

document.querySelector("#btn").addEventListener("click", function () {
  fingerprintReport().then(details => {
    checkDeviceSupport(() => {
      details.components.push(
        { 'key': 'hasWebcam', 'value': hasWebcam },
        { 'key': 'hasSpeakers', 'value' : hasSpeakers },
        { 'key': 'hasMicrophone', 'value' : hasMicrophone },
        { 'key': 'isMicrophoneAlreadyCaptured', 'value' : isMicrophoneAlreadyCaptured },
        { 'key': 'isWebcamAlreadyCaptured', 'value' : isWebcamAlreadyCaptured }     
      )
      showDetails(details);
    });
  })
});
