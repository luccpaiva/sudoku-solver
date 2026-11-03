# Roadmap

What comes next, roughly in order. The solver has sudokuwiki.org's basic, tough and diabolical strategies; most of this is the extreme ones, and making the workspace easier to learn from.

## Strategies

- **Extreme strategies**, each with its sudokuwiki.org examples as tests and a section in the strategy guide: Grouped X-Cycles, Empty Rectangles, Finned X-Wing and Swordfish, Sue de Coq, Alternating Inference Chains, Almost Locked Sets, Death Blossom, the forcing chains (digit, cell, unit and Nishio) and Pattern Overlay.
- **SK Loops in the library**: find or generate a puzzle that needs it, so every strategy has one.
- **Rating**: grade puzzles against a published scale and check the grades on known puzzles.

## Workspace

- **Hints**: name the next strategy first, then point at its cells, then show the step.
- **Bring a puzzle**: paste one as 81 characters, or open one from a link.
- **Keep the solve**: the puzzle and its solve path saved in the browser and in the link.
- **Small screens**: a layout and touch input for phones.

## Project

- **The PyGame app**: move the first version into its own folder, or retire it, now that the web app does everything it did.
- **CI**: tests and the build on every push with GitHub Actions.
- **Hosting**: the workspace on GitHub Pages.
