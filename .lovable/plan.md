---
name: Fix YouTube Playback
description: Ensure YouTube playback is reliable by properly cleaning up previous instances and destressing the initialization flow.
type: feature
---
- YouTube player initialization in `AudioPlayerContext` should use a cleaner container management approach.
- Ensure the YouTube IFrame API is fully loaded before attempting player creation.
- Background music YouTube integration should handle origin and JS API parameters consistently with the main player.
- Improve cross-origin parameter handling in `toEmbedUrl` to prevent playback blocks.
