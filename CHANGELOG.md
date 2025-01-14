# Changelog

## Version 0.2.0 (Beta Release)

### New Features
- **Git Modification Tracking**:
  - View files sorted by their last Git commit date.
  - Includes uncommitted changes with fallback to OS modification dates.
- **Dual Modes**:
  - Added `Latr: Show OS Modified Files` and `Latr: Show Git Modified Files` commands for separate tracking modes.
- **Color Coding**:
  - Most recent files are highlighted with a distinctive icon and color.
  - Older files are displayed in grey for easy differentiation.
- **Dynamic Directory Highlighting**:
  - Files responsible for a directory's position in the list are highlighted.
  - Ensures quick identification of impactful changes.

### Fixes and Improvements
- Fixed "Invalid Date" issue for uncommitted changes by providing fallback to OS modification dates.
- Removed duplicate files in the Git tracking view by ensuring unique file paths.
- Enhanced tooltips with source information (e.g., "Uncommitted Changes," "Git," or "OS").
- Improved sorting functionality with a toggle between ascending and descending order.

---

## Version 0.1.0 (Initial Release)

### Features
- Real-time tracking of recently modified files in the workspace.
- Auto-refresh functionality to dynamically update file lists as changes occur.
- Customizable exclusion patterns (e.g., node_modules, .git).
- Sorted file list displayed in the Explorer sidebar.
- Quick navigation to files by clicking in the sidebar view.
