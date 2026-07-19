---
title: >
    Home Assistant RF integration
layout: post
group: blog
description: >
    Automating an RF-only projector screen from Home Assistant
---

One of the most [automated]({% post_url 2024-06-15-homelab %}) areas of my home is my home theater. This uses the (sadly defunct) [Harmony Hub](https://support.myharmony.com/en-us/hub), which allows both network and IR control of devices and also reports its status to home assistant. This means that I can turn on the projector, set up the remote, turn off the lights, and set up audio either from the remote itself or from network control. Unfortunately, my motorized projector screen uses a 433MHz RF remote, which is not something the Harmony has hardware for. I wanted the screen to drop when I start watching and roll back up when I power everything off.

Fixing this is pretty easy; a very simple Raspberry Pi shield allows for RF transmit, a script captures what the screen remote sends for up/down, and AppDaemon listens for changes to state from the Harmony

{% include image.html src="/img/posts/2024-10-27-rf-projector-screen/board.png" alt="A 433MHz transmitter soldered to a Raspberry Pi GPIO header" caption="The RF hat" %}

```
# Some error handling and logging removed for readability
def harmony_hub_changed(self, entity, attribute, old, new, kwargs):
        current_activity = self.get_state(self.harmony_hub, attribute="current_activity")
        
        if current_activity != "PowerOff":
            self.log(f"Harmony hub activity detected: {current_activity}, lowering screen", level="INFO")
            self.screen_down()
        else:
            self.log("Harmony hub powered off, raising screen", level="INFO")
            self.screen_up()
    
    def screen_down(self):
        # Turn on screen switch twice with delay, to match remote behavior
        self.call_service("switch/turn_on", entity_id=self.screen_switch)
        self.run_in(self.screen_delay_callback, self.screen_delay / 1000.0)
    
    def screen_up(self):
        # Turn off screen switch twice with delay, to match remote behavior
        self.call_service("switch/turn_off", entity_id=self.screen_switch)
        self.run_in(self.screen_delay_callback_off, self.screen_delay / 1000.0)
```

```yaml
switch:
  - platform: rpi_rf
    gpio: 17
    switches:
      screen:
        code_on: 12025732
        code_off: 12025729
```

At the moment, this uses a custom rpi_rf component for HA, which is a holdover from a previous integration which did not use AppDaemon. Eventually, I'll move the RF code directly into AppDaemon as well (or rebuild on top of an ESP32 running ESPHome).