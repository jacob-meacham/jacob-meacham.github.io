---
title: Media Panel
layout: default
---

It all started with an old laptop that we had lying around. Jessie upgraded to a much smaller netbook, leaving a nice 15” screen just lying around. I’m loathe to dispose of electronics - beyond the graveyard of laptops and old desktops, I also have bad RAM, decaying power supplies, and other assorted bits and bobs floating around the house. I stumbled across someone who had built a touch screen out of a laptop screen, and after doing a bit of research, I discovered that using a laptop screen standalone is actually really simple and pretty cheap. I decided that I would build a media panel for the wall, that could display pictures, todo lists, or anything else we wanted to see.

Parts
----- 
Aside from the screen, I knew I needed a couple of other materials:
* Plywood for the front
* Hardwood for the frame
* A computer to run the media panel
* A regulator and board to run the screen
* LED strip lighting to make it look cool

It turns out that you can buy regulators straight from China on ebay for a pretty decent price. You send them the make of your LCD screen, and they send you a board and voltage regulator with HDMI and DVI out, as well as the standard options you’d expect on a screen. Mine came with an attractive set of buttons soldered onto a simple board to drive the whole thing.

For the computer, I decided to use a Raspberry Pi that I had laying around. It’s currently the brains behind our home automation setup, but I figured the little guy was powerful enough to run a media panel at the same time.

I sprung for some relatively nice LED strips (#link#). The first strip I got didn’t put out nearly enough light, so I ended up stashing it away (I’m sure it will be perfect for some other project) and picked up an RGB 5 meter roll with XX LEDs/inch. Unfortunately, it came with a waterproofing layer attached, which I had to painstakingly peel off by hand. We were finding little bits of plastic boogers in the carpet for a week after the project was done.

To power the whole thing, I got a voltage splitter (link) and split voltage between the Pi and the LCD screen. This splitter may be tiny, but it is SOLID. Even under load, the voltage never wavers from what I set it at.

Drawing for media panel idea
----------------------------

I wanted the look of the media panel to be futuristic. I drew some inspiration from Tron, as well other circuit-like designs. I sketched a couple of designs out, choose the one I liked best and transferred it to a piece of ¼” hardwood plywood. I also laid out my components, which didn’t go quite as planned, as we’ll soon see.

Although I have access to a pretty nice machine shop with several CNC machines, I wanted to try improving my scroll saw skills, so I decided to do all of the tracings by hand. I started by cutting out the space for the screen. Since I’ve never mastered the 90 degree scroll saw turn, I then drilled billions of holes (or at least that’s how it felt). My scroll saw also didn’t have a large enough throat, so I had to flip the blade and pull into it instead of push - I ended up breaking 8-10 blades over the course of all of the tracings.

The plexiglass plate design on the front was inspired by a computer mod I’d seen. I thought it was a really great effect, and seemed pretty easy to recreate (oh how wrong I was). I got a couple of scraps of clear plexiglass from the local plastics store and gave them some 30 degree chamfers with the table saw. Because they were so small, I was only able to effectively chamfer 3 of the 4 sides on the table saw, and I had to resort to doing it by hand for the last side. Luckily, a quick round with a little hand plane and a sandpaper block put the side where it should be. I finished off the chamfers with a round of sanding with progressively finer grits to give it a nice clean look.

Since I wanted the LED strips to create an effect where the edges of the plexiglass shine, I needed to ensure that the light bounced towards the edges instead of just going straight through. I tried a lot of different techniques to cut a satisfactory triangular groove in the plexiglass pieces (and went through quite a bit of plastic). I eventually ended up using a triangular bit, a dremel, many shallow passes, and a lot of cusses. The end result is really nice though!

I cut and soldered my LED strips together. This took a bit of doing, because I had to bend the strips pretty drastically to get them to conform to the inside of the frame, which meant I was putting pressure on my solder joints. I had to resolder everything a couple of times, as only one color or another would ever light up. At one point, I burnt out one of the controllers, which will now only emit a sickly green light. Luckily, the controllers are around $3 a piece, so it was no big loss.

Right now, the LEDs are controlled by a remote, which is pretty nice, but one of the things I’d like to do is change the LED strips to digital strips and hook them up to the GPIO pins on the Pi. https://learn.adafruit.com/raspberry-pi-spectrum-analyzer-display-on-rgb-led-strip/led-strip-and-rgb-led-software This would let me add effects like automatic dimming at night, or changing the color of the LEDs to match the color of what is on screen. The Z-Wave connector takes up a number of the pins, but there are enough left to control the LED strips in this manner.