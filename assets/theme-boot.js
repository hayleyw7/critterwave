(function () {
  // Resolve before first paint so saved Off also applies to the title and loaders.
  var motionKey = "critterwave-motion";
  var motionChoice = "device";
  var deviceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  try {
    var savedMotion = localStorage.getItem(motionKey);
    if (savedMotion === "on" || savedMotion === "off") motionChoice = savedMotion;
  } catch (_error) {
    /* Use the device preference when browser storage is unavailable. */
  }
  function syncMotion() {
    var root = document.documentElement;
    var reduced = motionChoice === "off" || (motionChoice === "device" && deviceMotion.matches);
    var changed = root.hasAttribute("data-reduced-motion") !== reduced;
    root.toggleAttribute("data-reduced-motion", reduced);
    if (changed) window.dispatchEvent(new Event("critterwave-motion-change"));
  }
  syncMotion();
  deviceMotion.addEventListener("change", syncMotion);
  document.addEventListener("DOMContentLoaded", function () {
    var selected = document.querySelector('input[name="game-motion"][value="' + motionChoice + '"]');
    if (selected) selected.checked = true;
  });
  document.addEventListener("change", function (event) {
    var target = event.target;
    if (!(target instanceof HTMLInputElement) || target.name !== "game-motion") return;
    if (target.value !== "on" && target.value !== "off" && target.value !== "device") return;
    motionChoice = target.value;
    try {
      if (motionChoice === "device") localStorage.removeItem(motionKey);
      else localStorage.setItem(motionKey, motionChoice);
    } catch (_error) {
      /* The choice still takes effect for this page. */
    }
    syncMotion();
  });
  try {
    if (localStorage.getItem("critterwave-intro-seen") === "1") {
      document.documentElement.setAttribute("data-title-seen", "");
    }
  } catch (_error) {
    /* The title still works when browser storage is blocked. */
  }
  var key = "critterwave-v1.1";
  var legacyKeys = ["critterwave-v1.0", "critterwave-v0.7", "critterwave-v6"];
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
