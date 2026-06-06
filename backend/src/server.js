import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { characters, dialogues, quest, questSteps } from "./data.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const progressByUser = new Map();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");

app.use(cors({ origin: frontendOrigin }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/characters/:id", (req, res) => {
  const character = characters[req.params.id];

  if (!character) {
    return res.status(404).json({ error: "Character not found" });
  }

  return res.json(character);
});

app.post("/api/quests/start", (req, res) => {
  const { userId, characterId } = req.body || {};

  if (!userId || !characterId) {
    return res.status(400).json({ error: "userId and characterId are required" });
  }

  if (!characters[characterId]) {
    return res.status(404).json({ error: "Character not found" });
  }

  const firstStep = questSteps[0];
  const progress = {
    questId: quest.id,
    currentStep: firstStep.stepNumber,
    currentCharacterId: characterId,
    nextCharacter: firstStep.nextCharacterId,
    isCompleted: false,
    status: "in_progress",
  };

  progressByUser.set(userId, progress);

  return res.status(201).json(progress);
});

app.get("/api/quests/:userId", (req, res) => {
  const progress = progressByUser.get(req.params.userId);

  if (!progress) {
    return res.status(404).json({ error: "Quest progress not found" });
  }

  return res.json(progress);
});

app.put("/api/quests/:userId", (req, res) => {
  const current = progressByUser.get(req.params.userId);

  if (!current) {
    return res.status(404).json({ error: "Quest progress not found" });
  }

  const { questId, step, status, currentCharacterId } = req.body || {};

  if (!questId || !step || !status || !currentCharacterId) {
    return res.status(400).json({ error: "questId, step, status, and currentCharacterId are required" });
  }

  const nextStep = questSteps.find((item) => item.stepNumber === step);
  const updated = {
    questId,
    currentStep: step,
    currentCharacterId,
    nextCharacter: nextStep?.nextCharacterId || null,
    isCompleted: status === "completed",
    status,
  };

  progressByUser.set(req.params.userId, updated);

  return res.json(updated);
});

app.post("/api/dialog", (req, res) => {
  const { characterId, questStep } = req.body || {};

  if (!characterId) {
    return res.status(400).json({ error: "characterId is required" });
  }

  const characterDialogues = dialogues[characterId];
  const dialogue = characterDialogues?.[questStep] || characterDialogues?.[1];

  if (!dialogue) {
    return res.status(404).json({ error: "Dialogue not found" });
  }

  return res.json(dialogue);
});

app.use(express.static(frontendDistPath));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  return res.sendFile(path.join(frontendDistPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
