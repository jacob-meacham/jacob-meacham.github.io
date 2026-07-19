---
title: >
    Electromagnetic Treasure Chest Build
layout: post
group: blog
image_path: img/posts/2026-03-12-treasure-chest
description: >
    Building a chest with an electromagnetic unlock
---

{% include portfolio_images.html %}

This year, my eldest daughter really wanted a dragon-themed party. We ended up going all out, with a scavenger hunt, potions, a cave, and a very cool cardboard dragon crafted by my wife. The prize at the end of the scavenger hunt was a treasure chest, which only opened after four magnetic gems were inserted into the right slots.

# The build

The chest itself was constructed from 1/2" plywood that I ripped into 3/4" strips and then built up like a log cabin. I used a laser cutter to cut out a template for the profile of the sides of the top and then did a bit of math to cut the strips along the top at an angle to set them together. I also used a laser cutter to cut out the slots for the gems.

The electronics are powered by an ESP32 and a very simple circuit with four reed switches and four addressable LEDs along with a 12V EM lock. I used a portable battery to power both the 12V lock (via a boost converter) and the ESP32.

{% include image.html src="/img/posts/2026-03-12-treasure-chest/003.webp" alt="The guts" caption="The guts" %}

I designed it so that everything could live in the top of the chest and I would then add a false top to hide the electronics, but I ended up leaving them exposed. The reed switches and LEDs were routed to the outside of the chest, and some very simple firmware detected magnets on each of the reed switches, which then allowed the chest to pop open once all four switches were active. You can find the code for this project [here](https://github.com/jacob-meacham/treasure-chest), including [wiring instructions](https://github.com/jacob-meacham/treasure-chest/blob/main/WIRING.md).

<figure>
  <iframe width="315" height="560" src="https://www.youtube.com/embed/2yGxGxqi91I" title="Seating the last gem triggers the rainbow chase" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
  <figcaption>Seating the last gem triggers the rainbow chase.</figcaption>
</figure>
