# Antigravity Developer & Workflow Notes

Welcome to the project! This document serves as the guide for the **Antigravity** coding assistant, building upon the original [CLAUDE.md](file:///c:/code/vegfestsignup/CLAUDE.md) instructions and detailing lessons from the latest commits.

---

## 🛠️ Antigravity General Guidelines

1. **Complete All Tasks**: Never deliver half-done work or placeholders. Ensure UI and API files build and type-check successfully before declaring a task complete.
2. **Git Restrictions**: 
   - **Never run git push or git commit**. The user handles all reviews, commits, and pushes.
   - Do **NOT** use git worktrees. Work directly on the `main` branch so live-reload dev servers can pick up changes correctly.
3. **Command Execution Style**:
   - Antigravity cannot run `cd` commands (due to system-level constraints).
   - When executing commands, specify the directory path in the `Cwd` parameter of the execution tool, or run root scripts.

---

## 🚀 Environment & Monorepo Structure

- **UI (Angular 18 Frontend)**: Located in [ui/](file:///c:/code/vegfestsignup/ui/)
- **API (Node.js/Express Backend)**: Located in [api/](file:///c:/code/vegfestsignup/api/)

### Root Monorepo Commands
We can run build and dev commands from the root directory [vegfestsignup/](file:///c:/code/vegfestsignup/) using `npm`:
* Run frontend development server: `npm run dev:ui`
* Run backend API development server: `npm run dev:api`
* Build all (UI & API): `npm run build:ui` and `npm run build:api`

### Direct Folder-Level Commands
To build or type-check directly, run these commands using the target folder as the `Cwd`:

* **Verify UI builds**:
  - `Cwd`: [ui/](file:///c:/code/vegfestsignup/ui/)
  - `CommandLine`: `npx ng build --configuration production` (or `npm run build`)
* **Verify API type-checks**:
  - `Cwd`: [api/](file:///c:/code/vegfestsignup/api/)
  - `CommandLine`: `npx tsc --noEmit`
* **Run Tests**:
  - UI Tests: `npm test` in [ui/](file:///c:/code/vegfestsignup/ui/)
  - API Tests: `npm test` in [api/](file:///c:/code/vegfestsignup/api/)

---

## 🎨 UI Patterns (Angular)

- **Scoped SCSS**: Component styles live in `*.component.scss` alongside each component.
- **Admin Dashboard Layout**: Uses `.form-group` as a base class (flex column, gap, bold labels).
  - *Note*: Always override layouts using combined classes: `.form-group.some-modifier`. Single-class overrides will lose priority to the base style.
- **Pill Badge Design**: Status badges in the dashboard follow the pattern:
  ```css
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  /* colored background + border */
  ```

---

## 💡 Lessons Gleaned from Recent Commits

### 1. Document Approval Permissions (Commit `e528adb`)
* **Changes**: The legacy `canApprove` and user-level `isApprover` checks were removed. Document approvals are now strictly governed by the `isAdmin` property.
* **Roles**: Checks are performed via `authService.hasRole(['ADMIN', 'WEB_ADMIN'])`.
* **Files updated**:
  - HTML updates: [registration-details.component.html](file:///c:/code/vegfestsignup/ui/src/app/components/admin-dashboard/registration-details/registration-details.component.html)
  - Controller updates: [registration-details.component.ts](file:///c:/code/vegfestsignup/ui/src/app/components/admin-dashboard/registration-details/registration-details.component.ts)
  - User management HTML: [user-management.component.html](file:///c:/code/vegfestsignup/ui/src/app/pages/user-management/user-management.component.html)

### 2. Cancelled Status Flow (Commit `2e011a9`)
* **Changes**: Added a new `'Cancelled'` status to registrations.
* **Badge Styling**: Added `.cancelled` class in [registration-details.component.scss](file:///c:/code/vegfestsignup/ui/src/app/components/admin-dashboard/registration-details/registration-details.component.scss):
  ```scss
  &.cancelled {
      background: #f3f4f6;
      color: #6b7280;
  }
  ```
* **Status Transitions**: Cancelled registrations cannot be approved (`canApprove` returns `false`).
* **Interfaces & Services updated**:
  - [storage.service.ts](file:///c:/code/vegfestsignup/ui/src/app/services/storage.service.ts)
  - [dashboard.component.ts](file:///c:/code/vegfestsignup/ui/src/app/components/dashboard/dashboard.component.ts)
  - Reports components: [contact-info-report.component.ts](file:///c:/code/vegfestsignup/ui/src/app/components/reports/contact-info-report.component.ts) and [todos-report.component.ts](file:///c:/code/vegfestsignup/ui/src/app/components/reports/todos-report.component.ts)

---

## 🧹 Next Year Cleanup / Tech Debt

- **Remove `bipgmOwned` field**: The `bipgmOwned` boolean on registrations is redundant. BIPGM eligibility is now derived dynamically from `ownerDemographics` in [fee.service.ts](file:///c:/code/vegfestsignup/api/src/services/fee.service.ts). Once a fresh sign-up cycle begins, clean up the `bipgmOwned` field from the Registration model and UI forms.
