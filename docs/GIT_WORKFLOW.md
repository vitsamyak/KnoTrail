# KnoTrail Team Git Workflow & Branch Governance

This guide documents the team Git standards and operational workflow for KnoTrail development between **Samyak Gedam** and **Sanshrey Sanagar**.

---

## 1. Core Principles

1. **Always Be on a Named Branch**:
   Never write code or create commits while in a **Detached HEAD** state. Verify your branch with `git branch --show-current` before making changes.

2. **Never Commit While Resolving a Paused Rebase**:
   When Git stops during a `git pull --rebase` due to merge conflicts or edits:
   - Fix conflicts and stage changes with `git add <files>`.
   - Complete the operation using `git rebase --continue`.
   - **DO NOT run `git commit`** during a rebase pause. Running `git commit` creates commits directly on the temporary detached rebase HEAD, leaving Git in a perpetual detached rebase state.

3. **Fetch Before Integrating**:
   Always run `git fetch origin` to inspect what the other teammate pushed before pulling or merging.

4. **Zero Force-Pushes on Shared Branches**:
   Never use `git push --force` or `git reset --hard` on `main` or remote tracking branches. Reconcile branches with clean merges or fast-forward pulls.

---

## 2. Daily Development Workflow

### Starting Work

Before writing any new code:

```bash
# 1. Ensure you are on main
git checkout main

# 2. Fetch remote status
git fetch origin

# 3. Pull incoming updates safely
git pull origin main

# 4. Confirm clean status
git status
```

### Working on Small Changes directly on `main`

For routine updates:

```bash
# 1. Verify you are on main
git branch --show-current  # Must output: main

# 2. Stage and commit
git add <files>
git commit -m "feat/fix: descriptive message"

# 3. Fetch remote before pushing
git fetch origin

# 4. Push to remote
git push origin main
```

### Working on Larger Features / Subsystems (Recommended)

When working on features (e.g., backend endpoints, UI redesigns, deployment configurations):

```bash
# 1. Create a dedicated feature branch from updated main
git checkout main
git pull origin main
git checkout -b feat/my-feature-name

# 2. Make commits on the feature branch
git add <files>
git commit -m "feat: implement feature"

# 3. Push feature branch to GitHub
git push -u origin feat/my-feature-name

# 4. Open a Pull Request on GitHub for Sanshrey / Samyak review
```

---

## 3. Resolving Conflicts & Rebase Stops (The "Detached HEAD" Trap)

If you run `git pull --rebase origin main` and Git stops:

```bash
# Git will display:
# interactive rebase in progress; onto <sha>
# You are currently editing a commit...

# STEP 1: Check what is in conflict
git status

# STEP 2: Edit the conflicting files and resolve conflict markers (<<<<<<<, =======, >>>>>>>)

# STEP 3: Stage the resolved files
git add <resolved-files>

# STEP 4: Resume rebase (NEVER run git commit here!)
git rebase --continue

# If you want to cancel the rebase and return to safety:
git rebase --abort
```

---

## 4. Emergency Detached HEAD Recovery

If your terminal ever reports `[detached HEAD abc1234]` or `fatal: You are not currently on a branch`:

```bash
# 1. Save your detached commit immediately to a temporary branch:
git branch temp-save-work

# 2. Check if a rebase was stuck in progress:
git status

# 3. If rebase was in progress, complete or abort it:
git rebase --abort   # returns to your original branch safely

# 4. Switch to main:
git checkout main

# 5. Merge the saved work into main:
git merge temp-save-work

# 6. Delete the temporary recovery branch:
git branch -d temp-save-work
```

---

## 5. Automated Pre-Commit Protection

A Git pre-commit hook is installed at `.git/hooks/pre-commit`.

- **Protection**: Intercepts any `git commit` invocation if `HEAD` is detached and aborts with clear recovery instructions.
- **Normal Operations**: Completely transparent on regular branches (`main`, `feat/*`, etc.).
- **Override (if ever necessary for headless automated scripts)**:
  `ALLOW_DETACHED_COMMIT=1 git commit -m "message"` or `git commit --no-verify`.

---

## 6. Coordinating Work with Sanshrey

- Notify each other before merging PRs that modify deployment manifests (`render.yaml`), schema migrations, or package dependencies (`package.json`).
- If you notice incoming commits on `origin/main` from Sanshrey (`git fetch origin && git log HEAD..origin/main --oneline`), pull or merge them before starting local multi-file refactoring.
- Keep test suites green: ensure `npm test` passes 100% (all 149 tests) and `npm run build` compiles cleanly prior to pushing.
