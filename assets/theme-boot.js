(function () {
  var key = "critterwave-v0.7";
  var legacyKeys = ["critterwave-v6"];
  var raw = localStorage.getItem(key);
  if (!raw) {
    for (var i = 0; i < legacyKeys.length; i++) {
      raw = localStorage.getItem(legacyKeys[i]);
      if (raw) {
        break;
      }
    }
  }
  var mode = "dark";
  if (raw) {
    try {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.colorMode === "light") {
        mode = "light";
      }
    } catch (_error) {
      /* ignore corrupt save */
    }
  }
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", mode === "light" ? "#f8f0ff" : "#0a0612");
  }
  var manifest = document.querySelector('link[rel="manifest"]');
  if (manifest) {
    manifest.setAttribute(
      "href",
      mode === "light" ? "site-light.webmanifest" : "site.webmanifest"
    );
  }
})();
