---
title: "Backup-Power Camera"
summary: "An ESP32-CAM wireless camera that keeps recording through power cuts, with battery backup and a cellular (SIM) uplink."
role: "Solo builder"
tags: ["ESP32-CAM", "embedded", "power management", "cellular", "IoT"]
status: "completed"
hasDemo: true
demoComponent: "CameraSystemDiagram"
order: 50
---

A security camera built to stay up through power outages, exactly when
ordinary cameras go dark: battery backup takes over from the mains, and a
cellular uplink takes over from the local internet.

### How it works

- An ESP32-CAM records and streams the video
- A battery takes over when the mains power fails
- A cellular (SIM) uplink keeps it reachable when the local internet is down
  too

The diagram below shows the switch-over.

<!-- TODO (owner): More details to come: parts, runtime and photos. -->
