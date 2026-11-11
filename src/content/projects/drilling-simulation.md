---
title: "Drilling Simulation"
summary: "A physical well-drilling simulator for the National Iranian Drilling Company, with ESP32 boards acting as the rig's control panels and a Jetson Nano linking them to the simulation."
role: "Embedded + software"
tags: ["ESP32", "Jetson Nano", "embedded", "industrial", "oil & gas"]
hasDemo: false
order: 30
---

A physical well-drilling simulator for training, built for the National
Iranian Drilling Company. ESP32 boards act as the rig's real control panels,
so the people training on it work with panels and controls, not just a screen.

### What I built

- ESP32 firmware for each control panel
- The links from the panels to a Jetson Nano, which connects them to the
  simulation software

<!-- TODO (owner): More details to come: the panels, how they talk to each other, and who uses the simulator. -->
