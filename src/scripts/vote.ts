import type { VoteResponse } from "../pages/api/vote";

type VoteState = { count: number; voted: boolean };

const fetchJson = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
};

const updateButtonUI = (button: HTMLButtonElement, { count, voted }: VoteState): void => {
  const countEl = button.querySelector<HTMLElement>(".count");
  if (countEl) countEl.textContent = String(count);
  button.setAttribute("aria-pressed", String(voted));
};

const popHeart = (button: HTMLButtonElement): void => {
  const heart = button.querySelector<HTMLElement>(".heart");
  if (!heart) return;
  heart.classList.remove("heart-pop");
  void heart.offsetWidth; // force reflow to restart animation
  heart.classList.add("heart-pop");
  heart.addEventListener("animationend", () => heart.classList.remove("heart-pop"), { once: true });
};

export async function initVote(): Promise<void> {
  const buttons = document.querySelectorAll<HTMLButtonElement>("button[data-comic-id]");
  const buttonMap = new Map(
    Array.from(buttons)
      .filter((btn) => btn.dataset.comicId)
      .map((btn) => [btn.dataset.comicId!, btn] as const),
  );

  if (buttonMap.size === 0) return;

  const state = new Map<string, VoteState>();
  const pending = new Set<string>();

  const handleVote = async (comicId: string, button: HTMLButtonElement): Promise<void> => {
    if (pending.has(comicId)) return;
    pending.add(comicId);
    button.dataset.pending = "";

    const prev = state.get(comicId) ?? { count: 0, voted: false };
    const optimistic: VoteState = {
      voted: !prev.voted,
      count: prev.count + (prev.voted ? -1 : 1),
    };

    updateButtonUI(button, optimistic);

    try {
      const result = await fetchJson<{ count: number; voted: boolean }>("/api/vote", {
        method: "POST",
        body: JSON.stringify({ comicId }),
        headers: { "Content-Type": "application/json" },
      });

      const serverState: VoteState = { count: result.count, voted: result.voted };
      state.set(comicId, serverState);
      updateButtonUI(button, serverState);
    } catch (error) {
      console.error("Vote failed:", error);
      state.set(comicId, prev);
      updateButtonUI(button, prev);
    } finally {
      pending.delete(comicId);
      delete button.dataset.pending;
    }
  };

  for (const [comicId, button] of buttonMap) {
    button.addEventListener("click", () => {
      popHeart(button);
      handleVote(comicId, button);
    });
  }

  // Hydrate initial state
  try {
    const params = new URLSearchParams({ comic: [...buttonMap.keys()].join(",") });
    const data = await fetchJson<VoteResponse>(`/api/vote?${params}`);

    if ("error" in data) {
      console.error(data.error);
      return;
    }

    for (const { comicId, votes, userVoted } of data.result) {
      const voteState: VoteState = { count: votes, voted: userVoted };
      state.set(comicId, voteState);
      const button = buttonMap.get(comicId);
      if (button) {
        button.disabled = false;
        updateButtonUI(button, voteState);
      }
    }
  } catch (error) {
    console.error("Failed to fetch vote data:", error);
  }
}