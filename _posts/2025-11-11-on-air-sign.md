---
title: >
    An ON AIR sign for the home theater
layout: post
group: blog
description: >
    Building an ESPHome ON AIR sign that lights up when the theater is in use
---

{% include image.html src="/img/woodworking/022.webp" alt="An illuminated ON AIR sign" caption="Lit whenever the theater is live" %}

The door to my workshop is right behind the projector screen, which I love - one of the benefits of using a projector is that the space can be used in multiple ways (another big benefit is that watching during the day is challenging, meaning that the TV mostly stays off!). That said, I often found myself opening the door into the back of the screen when working on projects.

To that end, I built an ON AIR sign that lights up whenever the theater system is on, built on top of ESPHome (my first ESPHome project). I found it to Just Work(tm) (as much as I'm annoyed by "programming" in yaml).

The circuit is super simple - the ESP32 drives a short addressable LED strip and ESPHome takes care of the rest. An AppDaemon script uses the state of the Harmony Hub to turn the sign on and off (plugging into the same [HomeAssistant automations]({% post_url 2024-10-27-rf-projector-screen %}) as the rest of the theater system).

I built a walnut enclosure with dovetail joints at the corners and a dado for the front cover. The cover is laser-cut out of walnut plywood with frosted acrylic behind the cutout for diffusion.

{% include image.html src="/img/woodworking/023.webp" alt="Walnut enclosure with dovetail corner joints" caption="Dovetail corners" %}
