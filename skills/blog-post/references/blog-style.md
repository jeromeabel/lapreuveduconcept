# Blog Style Reference

## Voice & Tone

- **Personal journey**: Write as someone who just learned this. "I spent an hour confused about X until..."
- **Engineer mindset**: Honest about trade-offs, naming the why behind decisions
- **Conversational but precise**: Natural sentences, concrete examples, no fluff
- **First person**: "I", "we" (when discussing team/community conventions)
- Avoid: "In this article we will...", "It is worth noting that...", academic hedging

## Structure Pattern

```markdown
# [Honest title — what you actually built or learned]

<!-- 1-2 sentence hook: the problem or the surprising thing you discovered -->

## The problem / Why I needed this

<!-- Context: what you were building, what went wrong, what you didn't know -->

## [Key concept / decision / technique]

<!-- One focused topic per section. Each section = one lesson learned -->
<!-- Always include the "why" not just the "what" -->

## [Next key concept]

...

## What I'd do differently / What surprised me

<!-- Honest reflection. Optional but valuable. -->

## Minimal working example

<!-- The smallest code that proves the concept works -->
```

## Code Examples

- Show **minimal working examples**, not full app code
- Prefer inline snippets over large blocks
- Comment the *why*, not the *what*:
  ```ts
  // unique: true — one vote per visitor per comic, enforced at the DB level
  indexes: [{ on: ['comicId', 'visitorId'], unique: true }]
  ```
- Include failure cases when they're instructive

## Length & Depth

- Target: 800–1500 words for the final draft
- Each section: 2–5 paragraphs + optional code
- Brainstorm outline first; trim sections that don't add new insight

## What Makes a Good Technical Blog Post

1. **One clear thesis** — reader leaves knowing one non-obvious thing
2. **Concrete examples** — abstract explanations always need a counterpart in code or analogy
3. **Honest trade-offs** — what this approach sacrifices, why you chose it anyway
4. **Reproducible** — reader should be able to implement the core concept with minimal hand-holding
