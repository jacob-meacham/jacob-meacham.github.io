---
title: >
    Total compensation and laffer curves
layout: post
group: blog
description: >
    On the Laffer curve applied to non-monetary compensation
---

# I.

When thinking about compensation, we usually start with the most obvious monetary component - wages and bonus. In tech, this is usually closely followed by equity (with many conversations about how to evaluate liquid and illiquid grants). However, when thinking about building or maintaining a team, you want to consider the total compensation package offered. Similarly, if you make changes to those factors, you may be changing who you can attract, who stays, and who leaves first.

Consider: why do very smart people work in nonprofits or government, which tend to pay far less than for-profit companies? Early on, Palantir famously offered below-market salaries but compensated with a strong sense of mission and an intense, high-caliber culture—and recruited specifically for people who valued those things. They weren't underpaying; they were paying in a different currency disproportionately to people who valued that currency.

The broader set of compensation factors includes items like:
* What is the story I can tell about my work (cf [Humans are Storytellers]({% post_url 2023-05-17-humans-are-storytellers %}))?
* How fun are my coworkers?
* How great is the culture?
* How much capital will this job afford me in my social network?
* What is the work-life balance that is offered?
* Can I work remotely?

The influence any of these factors has on an individual is idiosyncratic, but most people are reasonably balanced along these dimensions. That said, some individuals are [spikier]({% post_url 2023-07-08-pointy-and-flat-cultures %}) along one of them. One approach for recruiting - especially if you can't compete on monetary compensation alone - is to spike your total compensation along a different axis and then find people for whom that factor is most valuable. I believe this is still a positive-sum interaction - the total compensation offered is one that a particular set of candidates are excited to take (although it is important to be up front about how that package is structured - for example, if you are a highly mission-driven company, that should show up all through the recruiting pipeline so that people who don't spike as much on mission-based compensation can drop out).

# II.

The [Laffer curve](https://en.wikipedia.org/wiki/Laffer_curve) is a theoretical bell-shaped curve (apocryphally first scribbled on a napkin) that reflects the relationship between taxation rate and tax revenue. At 0% taxation, no revenue is collected. Paradoxically, at 100% taxation, no revenue is collected either—no one will work, everyone will hide income. The shape is disputed, but if it holds, there is some point between 0% and 100% taxation that maximizes revenue. This means that additional taxation after a certain point is actually counterproductive.

I've long believed there is a Laffer curve for some of these non-monetary compensation factors in a graph of productivity vs compensation. Take work-life balance as an example. At 0% work-life balance, you will essentially attract no candidates, no matter how well you pay. At 100% work-life balance (a sinecure), you will get no productivity out of your employees, though you could of course afford to pay them very little. Holding other factors of total compensation equal, there is some point between the two extremes that maximizes productive output. This frame makes sense once you start considering compensation more broadly than just the monetary component. 

# III.

It also means that you can't simply change a factor and expect to retain the same level of talent without compensating elsewhere; this is especially true when you've recruited specifically for people who value that factor.

This can happen suddenly (a rescue shelter appending "and Puppy Kicking Center" to their sign), but more often happens gradually, and can be especially pernicious if you are making the change to a factor that you once were spiky in. A culture that once prized autonomy adds layers of process, or one that offered a certain level of work-life balance begins to tighten down. The changes are small, but they shift the compensation calculus for exactly the people you recruited on those dimensions. These people are also most likely amongst your strongest contributors because you're offering a relatively rare commodity that they highly value and so a higher-caliber talent is more likely to accept. This means that you are backfilling closer to the average of the market, and the relatively more mercenary people you recruit will likely be at a lower talent bar (without changing some other aspect of compensation to compensate).

To explore this idea further, I built a toy simulation. You can adjust the cash, equity, mission, and culture sliders and watch how they affect who joins, who stays, and total team output over time. Each simulated employee has unique weights over these compensation factors - some care mostly about cash, others about mission or culture - and their decision to stay or leave depends on whether their weighted total comp meets their expectations.

<iframe src="/lab/comp-viz/embed.html" style="width: 100%; height: 600px; border: 1px solid rgba(255,255,255,.12); border-radius: 14px; background: #0b1220;" frameborder="0" loading="lazy"></iframe>

<p style="text-align: center; font-size: 0.85em; color: #888; margin-top: 8px;">
<a href="/lab/comp-viz/" target="_blank">Open the full simulation in a new tab</a> for the best experience.
</p>

Three dynamics are worth watching for in the simulation:

First, **adverse selection**. When compensation drops along a factor, the people who leave first are the ones who valued that factor most. You don't lose talent uniformly; try dropping mission from 85 to 20 and watch who goes.

Second, **the coworker feedback loop**. When good people leave, churn rises, average performance drops, and the emergent "coworker quality" degrades, which further erodes total compensation for everyone who remains.

Third, **the whip tradeoff**. Crank down culture and you can squeeze more short-term output per person (the simulation models this as a "whip multiplier"), but you hemorrhage talent over time. Watch the total output chart—it may spike briefly and then collapse. That's the Laffer curve in action.

The simulation is obviously a toy as real compensation dynamics are messier, and there are important factors it doesn't model (equity vesting cliffs, team-specific dynamics, the labor market shifting underneath you).
