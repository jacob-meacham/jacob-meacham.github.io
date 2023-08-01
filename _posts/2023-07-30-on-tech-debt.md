---
title: On Tech Debt
layout: post
group: blog
description: >
    On ways to prioritize technical excellence work
---

I've found that making time for technical initiatives is one of those subjects everyone agrees is important to get right, and everyone has strong viewpoints on - often diametrically opposed ones. I want to start by defining technical debt, why I think the better way of thinking about it is technical excellence, and some common ways I've seen teams dealing with this work.

# The anchor

I'm fond of metaphors as a means to explore a topic. The metaphor I've found that resonates with non-technical stakeholders for tech debt is an anchor that the team must drag behind them. Over time, that anchor naturally gets heavier as it accumulates detritus found along the way, which means that the team pulling the anchor slows down. There are a couple ways of dealing with this:

1. Stop and clean away some of the accumulated debris
2. Ask the people who are pulling to exert more effort
3. Add more people to the front so you can pull harder (though only so many hands can grab the rope at the same time)
4. Simply decide that you're ok with the slower progress

This is usually a sufficient taxonomy to have a good conversation on when and why a team should spend time on technical debt. However, I think a better term is technical excellence. Technical excellence implies a sense of quality to the technical work, and is also broader in vision. Technical excellence certainly encompasses technical debt, as above, but also gives you some new tools:

5. Send some people ahead to smooth out the path so that you can move faster or accumulate less debt (by taking on initiatives that are forward-thinking instead of clean up tasks)
6. Change the shape of the anchor so that it accumulates detritus more slowly (by making structural codebase changes, instead of merely treating the symptom)
7. Abandon the current anchor and moving to a different path altogether (by doing a broader migration)

If a team only thinks in terms of technical debt, they tend to reach towards the first few tools and miss the rest. Likewise, if a team of engineers is never afforded the opportunity to tackle broader technical excellence, either due to a lack of slack or lack of alignment with their stakeholders, then morale tends to erode over time.

# How to tackle technical excellence

I have seen 5 primary models of balancing technical excellence work with customer-facing work.

## The Iron-Fisted PM/Stakeholder

The Product Manager or an important stakeholder has absolute control over the roadmap and doesn't listen to the team, so tech excellence work is rarely considered. When it is considered, it's usually the result of firefighting efforts, and is almost always focused on debt reduction. This seems to be a common operating model for teams and although it's easy to blame the PM or stakeholder, I just as often diagnose this as engineers abdicating their responsibility to own the roadmap and advocate for and measure technical excellence.

## The Higher-Up Diktat

Someone higher up in the org structure (usually a VP of Engineering or CTO) dictates that a certain percentage of effort must be spent on "tech debt reduction" or "stability" or "maintenance". This is often 20%, likely as a misapplication of Google's original 20% time, and the engineering manager is usually responsible for filling the designated allocation. Each team is on its journey, and has a unique balance of debt, excellence work, and customer-facing work, and a one-size-fits-all number ignores these different realities for different teams. It also puts the PM and team in a somewhat antagonistic relationship and requires them to negotiate on whether a work item should be classified as technical excellence or customer-facing work (and thus whose budget it should be withdrawn from)

## The Benevolent Dictator

The Product Manager has ultimate say over the roadmap, but the team has enough influence to advocate for important tech excellence items. Often, the PM doesn’t really understand the goals or the value of this work (whether due to their lack of effort or the team's lack of communication), but trusts the team is prioritizng correctly.

## Always Build with Quality

The engineers have full autonomy on delivering with quality and build that quality into each ticket so that work on maintaing technical debt happens in combination with customer-facing work. This can work well except that first, it doesn’t allow for a robust conversation of tradeoffs - sometimes the right thing for a team to do is take on known technical debt to be able to move more quickly. And second, it is still challenging to work on technical excellence which isn't easily tied to customer-facing work.

## The Mind Meld

The team operates as a single unit and has achieved [the mind meld]({% post_url 2023-03-13-the-mind-meld %}). The PM has a real understanding of the value of the tech excellence work and the engineers have a real understanding of the value of the customer-facing work. As a whole, the team decides what are the most important items to work on, and how to best accomplish those goals. This is the hardest structure to set up, and can be initially uncomfortable, but in my experience, the teams that produce the best outcomes end up here. 


