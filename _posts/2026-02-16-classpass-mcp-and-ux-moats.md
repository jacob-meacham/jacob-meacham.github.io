---
title: >
    ClassPass, MCP, and the absence of UX moats
layout: post
group: blog
description: >
    Building an MCP server on top of ClassPass was easy, legitimately useful, and a glimpse at what happens when standard UX can be replaced by something entirely new
---

# I.

I've been at ClassPass in one form or another since 2018, and one of the many reasons I'm here is because it helps connect people with experiences that enable them to lead happier, healthier lives. In fact, I love that our mission is to connect people with offline experiences, and that we don't particularly care how long someone stays in the app - what we care about is that they find a fulfilling offline experience. I've wanted to explore agentic tools for a while, and thought that ClassPass was an interesting platform to do so.

I built a proof of concept MCP server that wraps the ClassPass API. MCP (Model Context Protocol) is Anthropic's open standard for giving LLMs access to tools and data sources. The idea is straightforward: you define tools (with input schemas and descriptions), and an LLM can invoke them in the course of a conversation. Want to search for yoga classes near you tomorrow morning? Ask Claude, and it calls `search_schedules` with the right parameters.

The classpass-mcp server exposes nine tools: searching for venues and schedules, booking classes (behind a flag, since that spends real credits), and managing preferences like your default location and favorite studios. The whole thing is about 3,000 lines of Python, much of it Pydantic models and tool schema definitions. I built the core in a few evenings.

It was an interesting exercise in speed. This MCP is certainly not production ready - for instance, auth is hardcoded - and I don't find MCP particularly elegant (security is a bit of an afterthought, for example). That said, it's surprising how much of the ClassPass user experience I was able to reproduce in a small amount of code.

# II.

What most surprised me were the ways that the ClassPass MCP interacted with other agent tools to create better UX possibilities in several specific ways.

The simplest is calendar integration. ClassPass the app exists in isolation - you search for a class, you check your calendar in a different app, you go back to ClassPass, you book. With the MCP server running in Claude, I can say "find me a pilates class tomorrow that doesn't conflict with my calendar" and it just works, because Claude already has access to my calendar via a separate MCP server. We've often thought about integrating ClassPass more deeply with the calendar, but it's an awkward feature there. Here, the composition happens at the LLM layer, and is thus essentially free.

Or consider this: "book me into the same cycling class I did last week, but at the Williamsburg location instead." That requires memory of past bookings, a venue search, and schedule matching. We could of course explicitly build this, but there are ten thousand examples like this.

I've found that the most useful interactions aren't the ones that replicate what the app already does well (search, filter, book). They're the ones that combine ClassPass data with everything else the LLM has access to. "I'm traveling to London next week, find me studios near my hotel that have morning classes" works because the LLM can pull from my travel context without ClassPass knowing anything about my hotel. Or even "book me yoga next week" - the LLM can see my calendar, see my flight to London, and just search in London!

Of course, not all interactions were better in a text-based UX; photos and reviews, long-tail search results, and setting filters are all more seamless for now in a graphical experience. But many are on par and text-based has the edge for some.

# III.

This is interesting if you're building a consumer product: there are perhaps fewer UX moats here than there were a year ago.

Beyond the consumer component of ClassPass, we also have relationships with thousands of studios, and a credits system along with a subscription. Those are not touched by my MCP server. But the app? Building a fully functional if basic alternative interface in 3,000 lines of code means that the app experience is no longer as important.

This is doubly true because the UX layer that MCP enables isn't static. It improves every time the underlying LLM gets better at orchestrating tool calls, understanding context, or managing multi-step workflows. The MCP-based experience continues to improve by the ecosystem (more tools, better foundational model), while ClassPass needs to continue to ship features.

# IV.

I think deciding to expose your product's functionality via something like MCP is a bit of a one-way door. It's a bit like open vs closed source software. Keeping your code closed means that you retain full control over it, but also that no one can remix it. Once you open source it, people will use it and perhaps improve it in ways that you'd never imagine. That said, you lose some control over it; you can't unpublish.

Once the tools exist, whether officially or by someone reverse-engineering the API (and this is very simple for many consumer-side APIs), you've opened yourself up to UX disintermediation. Any LLM-based client can now compose your product's functionality with anything else the user has access to. Your carefully designed onboarding flow, notification-driven re-engagement loops can now be bypassed when the user interacts with your product through a chat interface that they control.

The upside, of course, is that this composition creates genuinely new value. The calendar integration I mentioned isn't just a parlor trick; it's a meaningfully better experience! The tension is real though. You lose control of the experience. You can't optimize a conversion funnel when the user never sees your funnel.
