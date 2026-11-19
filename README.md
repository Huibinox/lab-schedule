# Lab Schedule

A shared weekly laboratory schedule for assigning staff, principal investigators (PIs), dates, times, and tasks.

## Features

- View the weekly schedule by staff member and filter by PI.
- Add, edit, or delete scheduled tasks.
- Check for overlapping assignments for the same staff member.
- Synchronise saved changes through the shared schedule API and check for updates every 30 seconds.
- Detect concurrent edits and request a refresh before resubmitting.

The application interface remains in Chinese.

## Repository files

| File | Purpose |
| --- | --- |
| `index.html` | Browser interface and schedule interactions |
| `worker.js` | Shared schedule API worker |
| `schedule.json` | Schedule data file |

The browser interface connects to the API endpoint configured in `index.html`.
