# Spielzeuge project requirements

- Every game and its catalog entry must support Russian, German and English. Translate visible UI, instructions, shops, dialogue, event feedback and accessible labels.
- Use the shared language preference from `src/languages.ts` (`spielzeuge.lang`) and provide a discoverable language control. The default is Russian.
- Narrate meaningful clicked actions and character messages in the selected language, following Собачка. Add suitable quiet sound effects and a visible, persistent mute control for both speech and effects.
- Cancel obsolete speech after language changes or leaving the page. Delayed events must use the current language. Keep play functional when speech/audio/storage are unavailable.
- Verify all three languages and mobile layouts alongside gameplay. See README.md for the full project description and docs/ for individual game behavior.

## Delivery workflow

- The user has authorized autonomous commits, pushes and production deployments. Decide when a development milestone is complete; after its relevant checks pass, commit and push it, then deploy it immediately using `./deploy/deploy.sh`. Do not ask for repeated approval.
- Verify the affected public routes after deployment and report the result. Keep unrelated changes out of the milestone commit.
