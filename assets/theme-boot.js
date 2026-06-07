(function () {
  var key = "critterwave-v5";
  var raw = localStorage.getItem(key);
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
