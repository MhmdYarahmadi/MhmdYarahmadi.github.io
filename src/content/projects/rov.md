---
title: "ROV (Remotely Operated Vehicle)"
summary: "A tethered underwater vehicle with six thrusters, a camera and two LEDs, driven with a controller down to 30 m."
role: "Networking, embedded, controls, surface app"
tags: ["networking", "embedded", "robotics", "UDP", "Python", "Qt", "PID control", "Embedded C", "Linux", "RTSP", "ONVIF"]
status: "completed"
page: "/projects/rov/"
order: 20
---

A tethered underwater vehicle driven with a controller. I built the whole
chain, from the controller on the laptop down to the thrusters, and the
network that brings the camera video back up.

### How it works

- **Surface app (Python/Qt)**: reads the controller over Bluetooth, sends the
  operator's commands as UDP packets over Wi-Fi to a modem buoy, and shows the
  live camera feed
- **Network**: the buoy, the tether and a switch inside the ROV form one IP
  network; commands go down it and the IP camera's video comes back up
- **Raspberry Pi 5**: receives the UDP commands, decodes them, and sends PWM
  values to the ESP32 over USB serial
- **ESP32**: turns those values into PWM signals for the six thrusters, with
  PID control and automatic motion functions
- **Leak sensor**: our own design, read by the Raspberry Pi 5; if water gets
  inside the hull, the ROV rises back to the surface by itself

### Outcome

Driven with a controller, with live camera video on the laptop, down to 30 m.
Two LEDs behind clear acrylic covers switch on automatically once it gets dark.
