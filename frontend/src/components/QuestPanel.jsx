import { useEffect, useState } from "react";
import useAppStore from "../store/useAppStore";
import { getQuestProgress, startQuest, talkToCharacter, updateQuestProgress } from "../lib/api";

export default function QuestPanel({ characterId, characterName }) {
  const { userId, quest, setQuest, dialogue, setDialogue } = useAppStore();
  const [status, setStatus] = useState("Load progress or start a quest.");
  const [talkInput, setTalkInput] = useState("I am ready for the next clue.");

  useEffect(() => {
    getQuestProgress(userId)
      .then((payload) => {
        if (payload.questId) {
          setQuest(payload);
          setStatus("Progress restored from backend.");
        }
      })
      .catch(() => {
        setStatus("No saved progress yet.");
      });
  }, [setQuest, userId]);

  async function handleStartQuest() {
    try {
      const payload = await startQuest(userId, characterId);
      setQuest(payload);
      setStatus(`Quest started. Next character: ${payload.nextCharacter}.`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleTalk() {
    try {
      const payload = await talkToCharacter({
        userId,
        characterId,
        userMessage: talkInput,
        questStep: quest?.currentStep || 1,
      });

      setDialogue(payload);
      setStatus("Dialogue updated.");

      if (quest?.questId) {
        const updatedQuest = {
          questId: quest.questId,
          step: payload.step,
          status: payload.questComplete ? "completed" : "in_progress",
          currentCharacterId: payload.nextCharacter || characterId,
        };

        const progress = await updateQuestProgress(userId, updatedQuest);
        setQuest(progress);
      }
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="panel quest-panel">
      <p className="eyebrow">Quest Controls</p>
      <h2>{characterName}</h2>
      <p className="muted">{status}</p>

      <div className="button-row">
        <button type="button" onClick={handleStartQuest}>
          Start Quest
        </button>
        <button type="button" onClick={handleTalk}>
          Talk
        </button>
      </div>

      <label htmlFor="talk-input">Message</label>
      <textarea
        id="talk-input"
        rows="3"
        value={talkInput}
        onChange={(event) => setTalkInput(event.target.value)}
      />

      <div className="info-block">
        <strong>Quest</strong>
        <pre>{JSON.stringify(quest, null, 2)}</pre>
      </div>

      <div className="info-block">
        <strong>Dialogue</strong>
        <pre>{JSON.stringify(dialogue, null, 2)}</pre>
      </div>
    </section>
  );
}
