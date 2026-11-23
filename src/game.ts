import { init } from "./game/app.js";
import { unlockAudio } from "./game/audio.js";
import { INTRO_SEEN_KEY } from "./game/storage-keys.js";

declare global {
  interface Window {
    critterwave?: {
      win: () => void;
      lose?: () => void;
      winLog?: () => void;
      loseLog?: () => void;
    };
  }
}

const titleScreen = document.getElementById("title-screen")!;
const play = document.getElementById("title-screen-play")!;
let introSeen = false;
try {
  introSeen = localStorage.getItem(INTRO_SEEN_KEY) === "1";
} catch {
  // A blocked browser can still enter the game.
}
if (introSeen) {
  void init();
} else {
  titleScreen.hidden = false;
  play.addEventListener("click", () => {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // Continue without persistence when storage is unavailable.
    }
    titleScreen.hidden = true;
    void init();
    void unlockAudio();
  }, { once: true });
}
