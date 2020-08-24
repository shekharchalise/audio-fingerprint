document.querySelector("#btn").addEventListener("click", function () {
  audioFingerprint.run(function (fingerprint) {
    document.querySelector("#details").textContent = "AUDIO FINGERPRINT = " + fingerprint
  });
});