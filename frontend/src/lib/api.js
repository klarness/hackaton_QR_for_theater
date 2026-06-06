const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = "Request failed";

    try {
      const payload = await response.json();
      message = payload.error || message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  return response.json();
}

export function getHealth() {
  return request("/api/health");
}

export function getCharacter(characterId) {
  return request(`/api/characters/${characterId}`);
}

export function startQuest(userId, characterId) {
  return request("/api/quests/start", {
    method: "POST",
    body: JSON.stringify({ userId, characterId }),
  });
}

export function getQuestProgress(userId) {
  return request(`/api/quests/${userId}`);
}

export function updateQuestProgress(userId, payload) {
  return request(`/api/quests/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function talkToCharacter(payload) {
  return request("/api/dialog", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
