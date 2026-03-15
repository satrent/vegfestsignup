# Claude Workflow Notes

## General

- Always complete the full task — no half-done work
- Both the UI and API must build successfully before a task is considered done
- Never commit or push to git — the user handles all reviews, commits, and pushes
- We work directly on the `main` branch

## Environment

- The UI and API are typically running locally — code changes should be compatible with live-reload
- UI: Angular app in `ui/`
- API: Node/Express app in `api/`

## Workflow

1. Make the requested changes
2. Verify both `ui/` and `api/` build without errors
3. Present the changes for the user to review
4. User does the git review, commit, and push

## Repository Structure

- `ui/` — Angular frontend
- `api/` — Backend API

## Build Commands

```bash
# Verify UI builds
cd /c/code/vegfestsignup/ui && npx ng build --configuration production

# Verify API type-checks
cd /c/code/vegfestsignup/api && npx tsc --noEmit
```

## UI Patterns (Angular)

- Component styles live in `*.component.scss` alongside each component
- The admin dashboard uses a `.form-group` base class (flex column, gap, bold labels)
  - To override `.form-group` layout, use both classes together: `.form-group.some-modifier` — single-class overrides lose to the base style
- Status badges in the dashboard follow a pill pattern: `padding: 0.25rem 0.75rem`, `border-radius: 20px`, colored background + border
- The main admin dashboard component: `ui/src/app/components/admin-dashboard/`
- Registration detail slide-out: `ui/src/app/components/admin-dashboard/registration-details/`
