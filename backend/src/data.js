export const characters = {
  dragon: {
    id: "dragon",
    name: "Dragon",
    modelUrl: "",
    animations: ["idle", "talk"],
  },
  wizard: {
    id: "wizard",
    name: "Wizard",
    modelUrl: "",
    animations: ["idle", "gesture"],
  },
};

export const quest = {
  id: "quest-001",
  name: "Opening Night Mystery",
  description: "Meet the dragon, then continue to the wizard for the next clue.",
  startCharacterId: "dragon",
};

export const questSteps = [
  {
    stepNumber: 1,
    characterId: "dragon",
    description: "The dragon sends the player to the wizard.",
    nextCharacterId: "wizard",
  },
  {
    stepNumber: 2,
    characterId: "wizard",
    description: "The wizard completes the short demo quest.",
    nextCharacterId: null,
  },
];

export const dialogues = {
  dragon: {
    1: {
      npcReply: "Welcome to the theater quest. Find the wizard near the old stage.",
      nextCharacter: "wizard",
      step: 2,
      questComplete: false,
    },
  },
  wizard: {
    1: {
      npcReply: "You are early. Speak to the dragon first.",
      nextCharacter: "dragon",
      step: 1,
      questComplete: false,
    },
    2: {
      npcReply: "You found me. The first quest is complete.",
      nextCharacter: null,
      step: 2,
      questComplete: true,
    },
  },
};
