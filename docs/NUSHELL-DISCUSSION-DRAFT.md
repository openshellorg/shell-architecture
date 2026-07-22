# DevX trajectory: structured CLIs, language emit APIs, and agents (from OpenShellOrg / Dev-Centr)

Hi Nushell folks —

I'm Ryan (Open Shell Organization / [Dev-Centr](https://github.com/dev-centr)). We spent the last day actually *backing* Nushell instead of daydreaming about inventing Yet Another Shell. Sharing a trajectory we care about, and asking where upstream wants help vs where companions should stay out of the way.

## The short pitch

Classical shells force stdout to be both a **data pipe** and a **display canvas**. TUIs ditch the pipe. Plain CLIs keep the pipe and lose structure. Agents make that tax worse—they burn tokens scraping text.

Nushell already fixed the important part: **tables in the pipeline, render at the end**. PowerShell pioneered objects; Nu is the cross-platform version we want people to standardize on. We are **not** forking Nu. We are trying to make “works with Nushell” an easy default for CLI authors and for AI-agent workflows.

## What we're building (companions, not a rival shell)

| Repo | Job |
|------|-----|
| [openshellorg/nu-require](https://github.com/openshellorg/nu-require) | Nu-tailored CLIs call `validate()` early. If you're not in Nu but `nu` is on PATH → tell the user and **relaunch inside Nu**. If Nu is missing → clear error + homepage (+ optional install hint). |
| [openshellorg/nu-emit](https://github.com/openshellorg/nu-emit) | C-first library: build a row in memory, emit JSONL correctly. So people stop hand-`fprintf`ing JSON. Later: more languages; plugin-protocol path for folks who need typed *input*. |
| [openshellorg/shell-architecture](https://github.com/openshellorg/shell-architecture) | Written thesis / layers (SOS flag syntax vs structured I/O vs terminal protocols). |
| [openshellorg/open-shell-org](https://github.com/openshellorg/open-shell-org) | Separate track: Standardized Operations Syntax (flag consistency / certification). Complementary, not a Nu replacement. |

Dev-Centr docs (in progress locally): recommend Nu on every OS; explain the above; call out the NVIDIA name collision (below).

## The DevX gap we keep hitting

You do **not** have to rewrite apps in Nu script. Good. The tiers today are roughly:

1. Emit JSON/JSONL → `from json`
2. Ugly text → `detect columns`
3. Full plugin protocol → native Values (Rust SDK is real; other langs are thinner)

What still doesn't feel “DevX approved” for awareness/adoption: **polite language APIs** so a C (or Go/D/…) programmer never hand-builds JSON strings and never implements MsgPack framing on day one. `nu-emit` is our stab at tier 1 done right. We'd love guidance on:

* Conventions you'd bless for “Nu-friendly structured stdout” (JSONL? NDJSON field names? streaming rules?)
* Whether community C/Go emit libs should stay community-owned or eventually live closer to upstream
* Stability expectations for the plugin protocol as you head toward 1.0 (so we don't lie to C authors)

## NVIDIA OpenShell vs Nushell for agents (different layers)

NVIDIA shipped something also called **OpenShell** ([NVIDIA/OpenShell](https://github.com/NVIDIA/OpenShell)). Completely different job from our org name, and from Nushell:

* **NVIDIA OpenShell** = sandbox runtime under the agent. YAML policy for filesystem/network/process. Privacy router for inference. “Permissions out of the prompt.” Kernel/container confinement. Lets existing coding agents run with less trust.
* **Nushell** = structured pipeline shell. Makes tool composition and agent CLI chaining less of a regex disaster. Fast binary. Tables instead of text soup.

Nu does **not** replace sandbox policy. OpenShell does **not** replace structured pipes. Ideal world: agents run **inside** a sandbox **and** speak structured data through Nu (or Nu-friendly emit).

People who install only Nu and call it “agent safety” are solving the wrong layer. People who sandbox everything and still scrape ANSI tables are also leaving easy wins on the floor.

Our writeup (Dev-Centr general-knowledge): Nushell vs that stack for agents, plus a plain overview of NVIDIA OpenShell so the name collision doesn't eat people's brains.

## Trajectory we want (awareness + better shell apps)

1. New CLIs default to structured emit (Nu-friendly), not pretty-only text.
2. “Works with Nushell” = import a small lib (`nu-emit` / plugins), not a blog post.
3. Keep SOS (flags) and Nu advocacy as complementary tracks—don't invent a second shell language.
4. Use Nu inside agent sandboxes so agents get tables *and* confinement.
5. Talk to upstream before we paint any “official” bikesheds—hence this post.

## Asks

* Does this framing match how y'all think about external-tool DevX?
* Anything we should *not* do (naming, protocol assumptions, “Nu Certified” vibes) that would create support burden?
* Pointers to the best current docs for plugin protocol consumers outside Rust?

Happy to adjust companions to whatever makes upstream's life easier. Thanks for building the shell we actually want to recommend.

— Ryan  
https://github.com/openshellorg · https://devcentr.org
