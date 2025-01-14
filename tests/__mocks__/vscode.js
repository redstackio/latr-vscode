// __mocks__/vscode.js
const path = require('path');

module.exports = {
    workspace: {
        workspaceFolders: [
            { uri: { fsPath: '/latr-workspace' } },
        ],
        createFileSystemWatcher: jest.fn(() => ({
            onDidChange: jest.fn(),
            onDidCreate: jest.fn(),
            onDidDelete: jest.fn(),
        })),
    },
    window: {
        showInformationMessage: jest.fn(),
        registerTreeDataProvider: jest.fn(),
    },
    commands: {
        registerCommand: jest.fn(),
    },
    EventEmitter: jest.fn().mockImplementation(() => ({
        event: jest.fn(),
        fire: jest.fn(),
        dispose: jest.fn(),
    })),
    TreeItem: class {
        constructor(label, collapsibleState) {
            this.label = label;
            this.collapsibleState = collapsibleState;
        }
    },
    TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2,
    },
    Uri: {
        file: jest.fn((filePath) => ({ fsPath: filePath })),
    },
};
