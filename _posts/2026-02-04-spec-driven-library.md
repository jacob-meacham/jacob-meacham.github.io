---
title: >
    The spec is the library
layout: post
group: blog
description: >
    On a spec-driven library
---

Drew Breunig recently released [whenwords](https://github.com/dbreunig/whenwords), a time formatting library with no code in it - just a specification, test cases, and a prompt. His [blog post](https://www.dbreunig.com/2026/01/08/a-software-library-with-no-code.html) poses a question I haven't been able to stop thinking about: what does software engineering look like when we can meta-program in natural language?

I recently built 2 projects ([blockbuster](https://github.com/jacob-meacham/blockbuster) and [cueso](https://github.com/jacob-meacham/cueso)) that both required interacting the Roku's [External Control Protocol](https://developer.roku.com/docs/developer-program/dev-tools/external-control-api.md) (ECP). This protocol is a simple HTTP API that allows for local network control of a Roku device and includes a deep linking command that nominally allows linking into a particular title in a channel. However, there is no public documentation as to how deep linking works and so requires reverse engineering the scheme on a per-channel basis. In practice, most streaming services use an ID mechanism similar to their public web links (Netflix uses numeric IDs, Disney+ uses UUIDs, Prime Video uses ASINs) but figuring the scheme out and implementing it correctly is time consuming.

I initially built a working Kotlin implementation covering a few of my more used channels for [blockbuster](https://github.com/jacob-meacham/blockbuster that painstakingly implemented the reverse engineered specs. Intead of building this again for the python implemtation of [cueso](https://github.com/jacob-meacham/cueso), I decided to attempt something similar to [whenwords](https://github.com/dbreunig/whenwords) and meta-program the library as a natural language spec.


To that end, I created [roku-deeplink-spec](https://github.com/jacob-meacham/roku-deeplink-spec), a spec-only library. This contains three files:

```
roku-ecp-reference/
├── PROMPT.md           # Entry point: "start here"
├── SPEC.md             # The complete specification
├── test_fixtures.json  # 27 test cases
```

Running it is as simple as typing @PROMPT.md in your favorite LLM.

The heart of it is SPEC.md---a single document covering everything an LLM needs to produce a working implementation. I think of the spec as having five layers:

**The protocol subset.** Just the two HTTP endpoints needed (launch a channel, send a keypress), the timing constraint (2000ms post-launch delay), and nothing else. Not a general protocol reference - exactly the slice required for this task.

**A channel catalog.** A data table with each channel's ID, URL regex, content ID format, media type logic, and post-launch key. This is where precision matters most. The regex `(?:amazon\.com|primevideo\.com)/.*?/([B][A-Z0-9]{9})` captures an Amazon ASIN; getting the character class or quantifier wrong means it silently fails on real URLs.

**The algorithm.** Explicit pseudocode. Iterate channels, apply regex with search semantics, extract capture group 1, determine media type, build the action sequence.

**Worked examples.** Six complete input-to-output traces, including the actual HTTP calls a Roku device would receive.

**Extensibility.** A checklist for adding a new channel, so the spec isn't frozen knowledge but a template for extension.

I've tested this out with Kotlin, Ruby, Typescript, and Python, and I imagine it would work in many more languages. The Python implementation is directly checked into cueso, but I'm now wondering whether it would be more appropriate to just reference the spec and generate the code on the fly (which would handle changes in the spec as more channels are added, for example).