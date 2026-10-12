# Version 0.8.11

Fixed the driver-name label rendering itself recursively instead of displaying the name. This caused runaway rendering and memory use, freezing pages with driver labels. Team-color markers remain.

The performance recording identified the recursive driver-label function and several gigabytes of browser heap growth. A component rendering regression check now covers names, team markers and fallback labels.
