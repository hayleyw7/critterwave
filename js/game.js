import { INTRO_SEEN_KEY } from "./game/storage-keys.js";
import { delayedTransitionStatus } from "./game/transition-status.js";
const titleScreen = document.getElementById("title-screen");
const play = document.getElementById("title-screen-play");
const titleError = document.getElementById("title-screen-error");
const page = document.documentElement;
const introSeen = page.hasAttribute("data-title-seen");
// Render the title independently of the game module graph. Preload the graph so a
// normal Play click can still boot immediately and use the click's audio activation.
const game = import("./game/app.js").then(runtime => ({ runtime }), (error) => ({ error }));
async function enterGame(fromPlay) {
    play.disabled = true;
    const done = fromPlay
        ? delayedTransitionStatus(document.getElementById("loading-critters"))
        : () => { };
    try {
        const result = await game;
        if ("error" in result)
            throw result.error;
        const startup = result.runtime.init();
        if (fromPlay)
            void result.runtime.unlockAudio();
        await startup;
        if (fromPlay) {
            try {
                localStorage.setItem(INTRO_SEEN_KEY, "1");
            }
            catch {
                // Continue without persistence when storage is unavailable.
            }
        }
        titleScreen.hidden = true;
    }
    catch (error) {
        console.error("Critterwave could not boot", error);
        page.removeAttribute("data-title-seen");
        titleScreen.hidden = false;
        titleError.hidden = false;
        play.textContent = "Retry";
        play.disabled = false;
        play.addEventListener("click", () => location.reload(), { once: true });
    }
    finally {
        done();
    }
}
if (introSeen) {
    void enterGame(false);
}
else {
    play.addEventListener("click", () => void enterGame(true), { once: true });
}
