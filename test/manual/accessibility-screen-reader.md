# Screen reader check

The automated tests (`test/e2e/accessibility-errors.test.mjs`) cover keyboard behaviour, page attributes and an axe-core
audit. None of that shows what a screen reader actually says. Run this by hand before claiming screen reader support, and
after changing `src/core/accessibility.js`.

Setup: NVDA with Firefox or Chrome on Windows (free), or VoiceOver with Safari on macOS. Serve the repository
(`cmd /c npm run server`) and open an example with a title, a legend and zoom buttons, for instance
`examples/choropleth/population-density.html`. Also check a proportional-symbol example and a flow example.

| Step | Expected |
| ---- | -------- |
| Read through the page | The map is announced as a map, named by its title and subtitle. A description set with `ariaDescription()` is read. |
| Tab to the map | One stop, announced with the instructions for the arrow keys. |
| Arrow keys on the map | Each region's name and value is spoken once, matching the visible tooltip. |
| Page Up / Page Down | The next or previous country (on a flow map: places or flows). |
| Escape, then Tab | The highlight and tooltip disappear and focus moves on. |
| Tab to the legend | Announced as the legend, with its title and labels. |
| Arrow keys on the legend | Each item is spoken and the matching regions are highlighted. |
| Tab to the buttons | "Zoom in", "Zoom out", legend and inset buttons are announced as buttons; Enter and Space work. |
| Browse mode (NVDA: arrow keys without focus) | Title, legend text and footer can still be read. |

Note the screen reader, browser, version and date of the check, and file an issue for anything that differs.
