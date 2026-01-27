# Migrating the docs folder to GitBook with Git Sync

This guide walks through syncing the ADPA **docs** folder to GitBook using **Git Sync**, so the docs live in the repo and GitBook renders them as the published site.

---

## 1. What’s already in the repo

These files are set up for Git Sync with the **docs** folder as the content root:

| File | Purpose |
|------|--------|
| **`.gitbook.yaml`** (repo root) | Tells GitBook to use `./docs/` as the content root and where the readme/summary are. |
| **`docs/README.md`** | GitBook homepage (first page). |
| **`docs/SUMMARY.md`** | GitBook table of contents (sidebar). Paths in SUMMARY are relative to `docs/`. |

`.gitbook.yaml` contains:

```yaml
root: ./docs/

structure:
  readme: ./README.md
  summary: ./SUMMARY.md
```

All paths in that file are relative to the repo root. Because `root` is `./docs/`, GitBook treats `docs/` as the root: e.g. `README.md` means `docs/README.md`, and paths in `SUMMARY.md` are relative to `docs/` (e.g. `01-getting-started/QUICK_START.md`).

---

## 2. Prerequisites

- **GitHub (or GitLab/Bitbucket)** repo with the ADPA codebase and the **docs** folder.
- **GitBook** account (team or org where the space will live).
- **GitBook GitHub app** installed and allowed access to this repo (you’ll do this during Git Sync setup).

---

## 3. GitBook space setup and Git Sync

1. **Create or open a GitBook space**  
   In [GitBook](https://www.gitbook.com), create a new space or use an existing one meant for ADPA docs.

2. **Open Git Sync configuration**  
   - Click the **space header** (top right).  
   - Choose **Configure**.  
   - Under integrations, select **GitHub Sync**.

3. **Connect GitHub**  
   - If needed, log in / authorize with GitHub.  
   - Install the **GitBook GitHub app** and grant access to the repo that contains `docs/` (or “All repositories” if you prefer).

4. **Choose repository and branch**  
   - Select the **account** and **repository** (e.g. `your-org/adpa`).  
   - Select the **branch** to sync (e.g. `main` or `adpa-project-charter`).  
   - Use the branch where `.gitbook.yaml` and `docs/` are committed.

5. **First sync direction**  
   - For “Migrating the docs folder **to** GitBook”, choose **GitHub → GitBook**.  
   - That pulls content from the repo into the space.  
   - GitBook will read `.gitbook.yaml` and use `root: ./docs/`, so only content under `docs/` is used.

6. **Run the initial sync**  
   - Start the sync.  
   - GitBook will use `docs/README.md` as the homepage and `docs/SUMMARY.md` for the sidebar.

---

## 4. After the first sync

- **Homepage**: Should show the content of `docs/README.md`.
- **Sidebar**: Should follow `docs/SUMMARY.md` (Getting Started, Setup & Configuration, Development, etc.).
- **Links**: Internal links in the markdown are relative to the *page* they’re on. Links like `[Quick Start](01-getting-started/QUICK_START.md)` work because they’re relative to `docs/`.  
  If you see broken links, they’re usually paths that assumed a different root (e.g. repo root); fix them to be relative to `docs/` or to the current page.

---

## 5. Rules to avoid conflicts

- **Edit in Git, not in GitBook** for:
  - `docs/README.md`
  - `docs/SUMMARY.md`
- GitBook says these are driven by the repo when Git Sync is on. Editing them in the GitBook UI can create duplication or conflicts.
- **Other pages** can be edited in GitBook if you want; those edits are synced back to GitHub via Git Sync (direction and branch depend on your Git Sync settings).

---

## 6. Updating the table of contents

- Edit **`docs/SUMMARY.md`** in the repo.
- Format (paths relative to `docs/`):

  ```markdown
  # Summary
  * [Overview](README.md)
  * [Documentation Index](INDEX.md)
  ## Getting Started
  * [Quick Start](01-getting-started/QUICK_START.md)
  ...
  ```
- Push to the synced branch; after the next sync, the GitBook sidebar will match.

---

## 7. Optional: excluding folders or files

GitBook’s behavior is “include what’s under `docs/`”. To effectively exclude something:

- **Option A**: Don’t list it in `SUMMARY.md`. The file/folder stays in the repo and in `docs/`, but won’t appear in the sidebar. It may still be discoverable via search or direct URL depending on GitBook.
- **Option B**: Move very large or internal-only content (e.g. `generated-documents`, `99-root-archive`) into a branch or repo that isn’t synced, or use a second GitBook space that syncs a different path.

`.gitbook.yaml` does not support “ignore” patterns in the same way as `.gitignore`; the main lever is what you put under `root` and what you add to `SUMMARY.md`.

---

## 8. Useful links

- [GitBook – Enabling GitHub Sync](https://docs.gitbook.com/getting-started/git-sync/enabling-github-sync)
- [GitBook – Content configuration (root, readme, summary)](https://docs.gitbook.com/getting-started/git-sync/content-configuration)
- [GitBook – Git Sync troubleshooting](https://docs.gitbook.com/getting-started/git-sync/troubleshooting)

---

## 9. Checklist

- [ ] `.gitbook.yaml` at repo root with `root: ./docs/`
- [ ] `docs/README.md` and `docs/SUMMARY.md` present and committed
- [ ] GitBook space created; GitHub Sync configured for the correct repo and branch
- [ ] Initial sync run with direction **GitHub → GitBook**
- [ ] Homepage shows `docs/README.md`
- [ ] Sidebar matches `docs/SUMMARY.md`
- [ ] Spot-check a few internal links; fix any that assume repo root or another base path

Once this is done, the docs folder is migrated to GitBook via Git Sync, and future edits in the repo (or in GitBook, for non-readme/summary pages) will drive the published site after each sync.
