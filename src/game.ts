import { init } from "./game/app.js";

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

void init();
