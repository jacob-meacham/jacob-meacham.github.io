---
title: Arduino Shooting Gallery
layout: default
group: lab
---

One weekend, some coworkers and I put together an office NERF shooting gallery in one of the big open spaces at our office. It was driven by an Arduino brain, and we ran rj11 cabling to each of the targets, which were a simple circuit in a small plastic box attached to a cardboard target. Each target assembly had 2 red LEDs for gameplay mechanics and a switch for detecting a hit. The RJ11 drove current to the LEDs and carried the switch signal. Everything was modularized so that the targets could be disconnected and reattached at will.

We also wrote an Arduino game interface and a web server to allow for various games to be played. Because the signal carried to the LEDs was analog, we could fade them, giving us three distinct target states - LEDs on, LEDs off, and LEDs fading. With this, we were able to put together a bunch of different game types, including time trials, marksman, and a classic shooting gallery.
