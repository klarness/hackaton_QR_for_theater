import { create } from "zustand";

const storedUserId = window.localStorage.getItem("theater-user-id");
const initialUserId = storedUserId || `guest-${crypto.randomUUID()}`;

if (!storedUserId) {
  window.localStorage.setItem("theater-user-id", initialUserId);
}

const useAppStore = create((set) => ({
  userId: initialUserId,
  quest: null,
  dialogue: null,
  setQuest: (quest) => set({ quest }),
  setDialogue: (dialogue) => set({ dialogue }),
}));

export default useAppStore;
