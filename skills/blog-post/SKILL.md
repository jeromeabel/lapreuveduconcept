---
name: blog-post
description: Use when the user asks to write a blog post, article, or project write-up from any source material. Triggers on "write a blog post", "create a work post", "write about this project", "turn this into an article", "write a post about [topic]".
---

# Blog Post

Write technical blog posts from any project material — specs, code, git history, or notes.

## Post Types

### Work post (`/work`)

Project showcase. Structure:

1. One-paragraph context (what the project is, why it exists)
2. **The problem** — bullet list, minimal
3. **The solution** — subsections with code blocks and images
4. **What I Learned** — honest bullet list, never elaborated

Frontmatter: `title`, `date`, `img`, `description`, `abstract`, `git`, `live` (optional), `stack` (array), `type` (tags)

### Blog post (`/blog`)

Technical deep-dive. Two valid modes:

**Tutorial mode** — step-by-step walkthrough:
- Short framing paragraph + link to repo
- Numbered architectural highlights
- Code blocks as the primary argument
- "What I Learned" closing section

**Curated mode** — thesis-driven with expert quotes:
- No preamble — jump to first heading
- Each section = claim (heading) + supporting evidence
- Sections separated by `---`

Frontmatter: `title`, `date`, `description`, `abstract`, `img` (optional), `draft` (optional)

## Workflow

### 1. Gather source material

Read whatever the user points to. This can be:
- Spec files, plan files, GUIDE files
- Source code (components, scripts, API routes)
- Git log and diffs (`git log --oneline`, `git diff`)
- README, notes, or any markdown
- The user's verbal description

Extract the key facts, decisions, problems solved, and lessons learned. Do not limit to `## LESSONS` sections.

### 2. Determine post type

Ask the user if not obvious:
- **Work post** — showcasing a finished project or feature
- **Blog post (tutorial)** — teaching how something was built, step by step
- **Blog post (curated)** — organizing insights around a thesis

### 3. Brainstorm

Produce in the chat (not in a file):

- **Working title** — honest, specific, no generic labels
- **Core thesis** — one sentence: what non-obvious thing does the reader learn?
- **Proposed sections** — 4–6 bullets, one concept per section
- **Code examples** — which snippets best prove the thesis?
- **What to cut** — material that's off-topic or too basic
- **Target length** — 800–1500 words

Present and wait for approval before writing.

### 4. Write the draft

Output path: `blog/<slug>.md` (kebab-case title). Follow the style rules below strictly.

### 5. Review with the user

After writing, summarize:
- The thesis
- Lessons or material omitted and why
- Sections that could be expanded

---

## Style Rules

### Voice

- First person, peer-to-peer. Use "I" and "we."
- Honest scope-setting: say what it is and isn't. ("This is a hands-on experiment, not a definitive guide.")
- Admit difficulty. ("I felt stuck when...", "This was harder than expected.")
- Engineer mindset: name the **why**, not just the what.
- Dry wit to deflate tension — never forced humor.
- Active voice always. ("The API throws an error", not "An error is thrown.")

### Code-first pedagogy

- Code blocks are the argument, not illustration.
- Every major claim needs a code snippet or concrete example.
- Comments in code serve as inline annotations.
- Diagrams as numbered images when visual explanation helps.

### Structure

- No intro boilerplate. ("In this post we will..." — never.)
- Section titles tell a story when read in sequence.
- "What I Learned" is a required closing — honest bullet list of actual new skills.
- Horizontal rules (`---`) to separate thematic groups when needed.

### Anti-Patterns (ban list)

**Banned structural patterns:**
- Formulaic scaffolding ("First... Second... In conclusion")
- False balance ("On one hand... on the other hand")
- Meta-commentary ("Let's delve into...", "Let's explore...")
- Rhetorical questions as transitions ("So, what does this mean?")
- Hype without substance ("game-changing approach")

**Banned words:** `delve`, `navigate`, `unpack`, `landscape`, `tapestry`, `game-changing`, `paradigm shift`, `leverage`, `utilize`, `harness`, `empower`, `robust`, `seamless`, `cutting-edge`

### Title polish

- Remove generic labels: "Introduction" → specific hook
- Replace vague terms: "The Solution" → name the actual technique
- Titles should form a logical progression when read as a list

---

## Key Constraints

- **Source material is the source of truth** — do not invent content not found in the project
- **Brainstorm before writing** — always show the outline and get approval first
- **Practical code** — every major claim needs a code snippet
- **Cut the fluff** — if a point can't be illustrated with code or analogy, cut it
- **No AI slop** — enforce the ban list strictly; read the draft once more before presenting
