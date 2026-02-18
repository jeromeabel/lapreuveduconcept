import type { VoteResponse } from "../pages/api/vote";

export async function initVote() {
    const buttons = document.querySelectorAll<HTMLButtonElement>('button[data-comic-id]');

    for (const button of buttons) {
        button.addEventListener('click', async () => {
            const span = button.querySelector('span');
            const previousCount = span?.textContent ?? '0';
            const previousVoted = button.classList.contains('text-green-500');

            // Optimistic update
            const newVoted = !previousVoted;
            const newCount = parseInt(previousCount) + (newVoted ? 1 : -1);
            span && (span.textContent = String(newCount));
            button.classList.toggle('text-green-500', newVoted);
            button.disabled = true;

            try {
                const comicId = button.dataset.comicId;
                const response = await fetch('/api/vote', 
                    { 
                        method: 'POST', 
                        body: JSON.stringify({ comicId }), 
                        headers: { 'Content-Type': 'application/json' } 
                    });
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error ?? `HTTP ${response.status}`);
                }
                const result = await response.json();
                // Reconcile with server truth
                span && (span.textContent = String(result.count));
                button.classList.toggle('text-green-500', result.voted);
            } catch (error) {
                console.error("Vote failed:", error);
                // Rollback
                span && (span.textContent = previousCount);
                button.classList.toggle('text-green-500', previousVoted);
            } finally {
                button.disabled = false;
            }
        });
    }
    
    const comicIds = Array.from(buttons).map((btn) => btn.dataset.comicId).filter(Boolean) as string[];
    if (comicIds.length === 0) return;

    let data: VoteResponse;
    try {
        const response = await fetch('/api/vote?comic=' + comicIds.join(','));
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error ?? `HTTP ${response.status}`);
        }
        data = await response.json() as VoteResponse;
    } catch (error) {
        console.error("Failed to fetch vote data:", error);
        return;
    }


    if ('error' in data) {
        console.error(data.error);
        return;
    }

    for (const { comicId, votes, userVoted } of data.result) {
        const button = Array.from(buttons).find(btn => btn.dataset.comicId === comicId);
        if (!button) continue;

        button.disabled = false;
        const span = button.querySelector('span');
        if (span) {
            span.textContent = votes.toString();
        }
        button.classList.toggle('text-green-500', userVoted);
    }
}