const vscode = require('vscode');
const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Latr extension is now active!');

    let recentFilesOS = [];
    let recentFilesGit = [];
    let currentMode = 'GIT'
    let sortDescending = true;

    const EXCLUDED_FOLDERS = [
        'node_modules', 'venv', '__pycache__', '.git', 'target', 'bin', 'obj', 'build', 'dist',
    ];

    /**
     * Updates the list of recent files based on OS modification timestamps.
     */
    async function updateRecentFilesOS() {
      if (currentMode !== 'OS') return;
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            console.warn('No workspace folders are open.');
            return;
        }

        recentFilesOS = [];

        for (const folder of workspaceFolders) {
            try {
                const folderPath = folder.uri.fsPath;
                const files = await getFilesInFolder(folderPath);

                const fileStats = await Promise.all(
                    files.map(async (file) => {
                        const stats = await fs.stat(file);
                        return { file, mtime: stats.mtime, source: 'OS' };
                    })
                );

                recentFilesOS.push(...fileStats);
            } catch (err) {
                console.error(`Error reading folder ${folder.uri.fsPath}:`, err);
            }
        }

        sortRecentFiles(recentFilesOS);

        recentFilesTreeProvider.refresh();
    }

    /**
    * Retrieves uncommitted files and their OS modification dates.
    * @param {string} folderPath - The folder path to scan.
    * @returns {Promise<{file: string, mtime: Date, source: string}[]>}
    */
    async function getUncommittedFiles(folderPath) {
      return new Promise((resolve, reject) => {
          exec(`git status --short`, { cwd: folderPath }, async (err, stdout) => {
              if (err) {
                  reject(err);
                  return;
              }

              const uncommittedFiles = [];
              const lines = stdout.split('\n').filter(Boolean);

              for (const line of lines) {
                  if (line.startsWith(' M ') || line.startsWith('?? ')) {
                      const filePath = line.substring(3).trim();
                      const fullPath = path.resolve(folderPath, filePath);

                      try {
                          const stats = await fs.stat(fullPath);
                          uncommittedFiles.push({
                              file: fullPath,
                              mtime: stats.mtime,
                              source: 'Uncommitted Changes',
                          });
                      } catch (fsErr) {
                          console.warn(`File not found: ${fullPath}: ${fsErr}`);
                      }
                  }
              }

              resolve(uncommittedFiles);
          });
      });
    }

    /**
     * Updates the list of recent files based on Git modification dates.
     */
    async function updateRecentFilesGit() {
      if (currentMode !== 'GIT') return;
      
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
          console.warn('No workspace folders are open.');
          return;
      }
  
      recentFilesGit = [];
  
      for (const folder of workspaceFolders) {
          const folderPath = folder.uri.fsPath;
          const seenFiles = new Set();
  
          try {
              const gitFiles = await getGitModifiedFiles(folderPath);
  
              gitFiles.forEach((file) => {
                  if (!seenFiles.has(file.file)) {
                      seenFiles.add(file.file);
                      recentFilesGit.push(file);
                  }
              });
          } catch (err) {
              console.error(`Error fetching Git files for folder ${folderPath}:`, err);
          }
      }
  
      sortRecentFiles(recentFilesGit);
  
      recentFilesTreeProvider.refresh();
    }

    async function getGitModifiedFiles(folderPath) {
      return new Promise((resolve, reject) => {
          // console.log(`Running git log in folder: ${folderPath}`);
          exec(
              `git log --name-only --pretty=format:"%ad %n" --date=iso`,
              { cwd: folderPath },
              async (err, stdout) => {
                  if (err) {
                      console.error(`Error running git log: ${err.message}`);
                      reject(err);
                      return;
                  }
  
                  // console.log(`git log output:\n${stdout}`);
  
                  const files = [];
                  const lines = stdout.split('\n').filter(Boolean);
                  let currentDate = null;

                  for (const line of lines) {
                    if (line.match(/^\d{4}-\d{2}-\d{2}/)) {
                        currentDate = new Date(line.trim());
                    } else if (currentDate) {
                        const fullPath = path.resolve(folderPath, line.trim());
                        files.push({ file: fullPath, mtime: currentDate, source: 'Git' });
                    }
                  }

                  const uncommittedFiles = await getUncommittedFiles(folderPath);
                  // console.log(`Uncommitted files:`, uncommittedFiles);
                  files.push(...uncommittedFiles);
  
                  const uniqueFiles = Array.from(
                      new Map(files.map((file) => [file.file, file])).values()
                  );
  
                  // console.log(`Unique files:`, uniqueFiles);
                  resolve(uniqueFiles);
              }
          );
      });
    }

    /**
     * Sorts recent files by modification time.
     */
    function sortRecentFiles(files) {
        files.sort((a, b) => {
            return sortDescending ? b.mtime - a.mtime : a.mtime - b.mtime;
        });
    }

    /**
     * Recursively retrieves all files in a folder, ignoring excluded folders.
     * @param {string} folderPath - The folder path to scan.
     * @returns {Promise<string[]>} - A list of file paths.
     */
    async function getFilesInFolder(folderPath) {
        let files = [];
        const entries = await fs.readdir(folderPath, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = path.join(folderPath, entry.name);
            if (EXCLUDED_FOLDERS.includes(entry.name)) {
                continue;
            }

            if (entry.isDirectory()) {
                files = files.concat(await getFilesInFolder(entryPath));
            } else {
                files.push(entryPath);
            }
        }

        return files;
    }

    /**
     * TreeDataProvider for displaying recent files in the Activity Bar.
     */
    class RecentFilesTreeProvider {
      constructor() {
          this._onDidChangeTreeData = new vscode.EventEmitter();
          this.onDidChangeTreeData = this._onDidChangeTreeData.event;
      }
  
      refresh() {
          this._onDidChangeTreeData.fire();
      }
  
      getTreeItem(element) {
          return element;
      }
  
      getChildren(element) {
          const currentFiles = currentMode === 'OS' ? recentFilesOS : recentFilesGit;
  
          if (!element) {
              // Top-level items: group files by directory
              const groupedByDirectory = currentFiles.reduce((groups, file) => {
                  const directory = path.dirname(file.file);
                  if (!groups[directory]) {
                      groups[directory] = [];
                  }
                  groups[directory].push(file);
                  return groups;
              }, {});
  
              return Object.keys(groupedByDirectory).map((directory) => {
                  return new vscode.TreeItem(
                      directory,
                      vscode.TreeItemCollapsibleState.Collapsed
                  );
              });
          } else {
              // Sub-level items: show files within a directory
              const directory = element.label;
              const files = currentFiles.filter((file) => path.dirname(file.file) === directory);
              const mostRecentTime = Math.max(...files.map((f) => f.mtime.getTime()));
  
              return files.map((file) => {
                  const isMostRecent = file.mtime.getTime() === mostRecentTime;
  
                  const treeItem = new vscode.TreeItem(
                      `${path.basename(file.file)} (${file.mtime?.toLocaleDateString() || 'Invalid Date'}, ${file.mtime?.toLocaleTimeString() || ''})`,
                      vscode.TreeItemCollapsibleState.None
                  );
                  treeItem.tooltip = `${file.file}\n${file.source}`;
                  treeItem.resourceUri = vscode.Uri.file(file.file);
  
                  // Highlight most recent files
                  if (isMostRecent) {
                      treeItem.description = "Most Recent";
                      treeItem.iconPath = new vscode.ThemeIcon('star-full');
                  } else {
                      treeItem.description = "Older";
                      treeItem.iconPath = new vscode.ThemeIcon('circle-outline');
                  }
  
                  // Add a command to open the file
                  treeItem.command = {
                      command: 'vscode.open',
                      arguments: [vscode.Uri.file(file.file)],
                      title: 'Open File',
                  };
  
                  // Set context value for right-click menu
                  treeItem.contextValue = 'latrFile';
  
                  return treeItem;
              });
          }
      }
    }

    /**
     * Get the commit hash where the file was last added.
     * @param {string} folderPath - The folder path of the workspace.
     * @param {string} relativePath - The relative path of the file.
     * @returns {Promise<string>} - The commit hash.
     */
    async function getLastAddedCommitForFile(folderPath, relativePath) {
      return new Promise((resolve, reject) => {
          exec(
              `git log -n 1 --format=%H --diff-filter=A -- "${relativePath}"`,
              { cwd: folderPath },
              (err, stdout) => {
                  if (err) {
                      console.error('Error fetching commit for added file:', err);
                      reject(err);
                      return;
                  }
                  const commitHash = stdout.trim();
                  // console.log(`Last added commit for ${relativePath}: ${commitHash}`);
                  resolve(commitHash || null);
              }
          );
      });
    }

    /**
     * Get the file content from Git history.
     * @param {string} folderPath - The folder path of the workspace.
     * @param {string} commitHash - The commit hash where the file existed.
     * @param {string} relativePath - The relative path of the file.
     * @returns {Promise<string>} - The file content.
     */
    async function getFileContentFromGit(folderPath, commitHash, relativePath) {
      return new Promise((resolve, reject) => {
          exec(
              `git show ${commitHash}:${relativePath}`,
              { cwd: folderPath },
              (err, stdout) => {
                  if (err) {
                      console.error('Error fetching file content from Git history:', err);
                      reject(err);
                      return;
                  }
                  resolve(stdout || null);
              }
          );
      });
    }

    /**
     * Get the language ID for a file based on its extension.
     * @param {string} filePath - The file path.
     * @returns {string} - The language ID.
     */
    function getLanguageForFile(filePath) {
      const ext = path.extname(filePath).toLowerCase();
      return (
          vscode.workspace.getConfiguration('files.associations')[`*${ext}`] ||
          ext.slice(1) ||
          'plaintext'
      );
    }
    
    const recentFilesTreeProvider = new RecentFilesTreeProvider();
    vscode.window.registerTreeDataProvider('latrRecentFilesView', recentFilesTreeProvider);

    const showRecentFilesOSCommand = vscode.commands.registerCommand(
        'latr.showRecentFilesOS',
        async () => {
            currentMode = 'OS';
            await updateRecentFilesOS();
            vscode.window.showInformationMessage('Recent files view updated for OS modified files!');
        }
    );

    const showRecentFilesGitCommand = vscode.commands.registerCommand(
        'latr.showRecentFilesGit',
        async () => {
            currentMode = 'GIT';
            await updateRecentFilesGit();
            vscode.window.showInformationMessage('Recent files view updated for Git modified files!');
        }
    );

    const toggleSortOrderCommand = vscode.commands.registerCommand(
        'latr.toggleSortOrder',
        async () => {
            sortDescending = !sortDescending;
            const currentFiles = currentMode === 'OS' ? recentFilesOS : recentFilesGit;

            if (!currentFiles || !Array.isArray(currentFiles)) {
                vscode.window.showErrorMessage('Failed to toggle sort order: No files available to sort.');
                return;
            }

            sortRecentFiles(currentFiles);
            recentFilesTreeProvider.refresh();
            vscode.window.showInformationMessage(`Sorting order: ${sortDescending ? 'Descending' : 'Ascending'}`);
        }
    );

    const openFromGitHistory = vscode.commands.registerCommand(
      'latr.openFromGitHistory',
      async (item) => {
          if (!item || !item.resourceUri) {
              vscode.window.showErrorMessage('No file selected to open from Git history.');
              return;
          }
  
          const filePath = item.resourceUri.fsPath;
          const workspaceFolder = vscode.workspace.getWorkspaceFolder(item.resourceUri);
  
          if (!workspaceFolder) {
              vscode.window.showErrorMessage('File is not part of the current workspace.');
              return;
          }
  
          const folderPath = workspaceFolder.uri.fsPath;
  
          try {
              // Get relative path for Git commands
              const relativePath = path.relative(folderPath, filePath);
              if (!relativePath) {
                  vscode.window.showErrorMessage('Failed to resolve relative path for the file.');
                  return;
              }
  
              // console.log(`Resolved relative path: ${relativePath}`);
  
              // Find the commit where the file was last added
              const commitHash = await getLastAddedCommitForFile(folderPath, relativePath);
              if (!commitHash) {
                  vscode.window.showErrorMessage('No Git history found for this file.');
                  return;
              }
  
              // console.log(`Commit where file was added: ${commitHash}`);
  
              // Retrieve the file content from Git history
              const fileContent = await getFileContentFromGit(folderPath, commitHash, relativePath);
              if (!fileContent) {
                  vscode.window.showErrorMessage('Failed to retrieve the file content from Git history.');
                  return;
              }
  
              // console.log(`File content retrieved successfully for ${relativePath}`);
  
              // Open the file content in a new editor tab
              const document = await vscode.workspace.openTextDocument({
                  content: fileContent,
                  language: getLanguageForFile(filePath),
              });
              await vscode.window.showTextDocument(document);
          } catch (err) {
              console.error('Error opening file from Git history:', err);
              vscode.window.showErrorMessage('An error occurred while trying to open the file from Git history.');
          }
        }
    );

    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');

    fileWatcher.onDidChange(updateRecentFilesOS);
    fileWatcher.onDidCreate(updateRecentFilesOS);
    fileWatcher.onDidDelete(updateRecentFilesOS);

    context.subscriptions.push(showRecentFilesOSCommand, showRecentFilesGitCommand, toggleSortOrderCommand, fileWatcher, openFromGitHistory);
}

function deactivate() {
    // console.log('Extension "Latr" has been deactivated.');
}

module.exports = {
    activate,
    deactivate
};