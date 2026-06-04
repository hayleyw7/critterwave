(function () {
  var key = "critterwave-v1";
  var legacy = ["goblinwave-v4", "goblinwave-v1"];
  var raw = localStorage.getItem(key);
  if (!raw) {
    for (var i = 0; i < legacy.length && !raw; i++) {
      raw = localStorage.getItem(legacy[i]);
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
})();
