# Latr - Recent File Tracker

Latr is a Visual Studio Code extension that helps you identify and manage recently modified files in your workspace. With advanced tracking options, Latr allows you to view recent changes based on OS modification dates or Git commit history, making it an essential tool for developers managing active projects.

[Download LATR from the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=RedStack.latr)

## Features

- **Two Modes of Tracking**:
  - **OS Modification Dates**: View files sorted by their last saved or modified time.
  - **Git Commit Dates**: View files sorted by their last Git commit time, including uncommitted changes.
- **Directory Highlighting**:
  - Directories are listed in order of their most recently modified files.
  - Files responsible for the directory's position are visually highlighted.
- **Dynamic Updates**: Automatically refreshes file lists as files are saved, modified, or staged.
- **Color-Coded Indicators**:
  - Most recent files are highlighted for quick identification.
  - Older files are displayed in grey.
- **File Tooltips**: View detailed information about each file, including whether it's tracked by OS or Git, or if it has uncommitted changes.

## Installation

To install Latr, search for "Latr" in the Visual Studio Code Extensions Marketplace and click "Install."

## Usage

1. **Access Recent Files**:
   - Use the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS) to run:
     - `Latr: Show OS Modified Files`
     - `Latr: Show Git Modified Files`
2. **Toggle Sort Order**:
   - Use the `Latr: Toggle Sort Order` command to switch between ascending and descending order.
3. **Explore the File Tree**:
   - Open the **Latr Recent Files** view in the Explorer sidebar.
   - Expand directories to view individual files, with most recent files highlighted.

## Upcoming Features

- Customizable settings to define exclusion rules, maximum file count, and color themes.
- Support for more version control systems beyond Git.

## License

This project is licensed under the Apache v2.0 License. See the [LICENSE](LICENSE) file for details.

## Contact Information

For any inquiries, please contact us at hello@redstack.io.

---

**Enjoy using Latr!**
