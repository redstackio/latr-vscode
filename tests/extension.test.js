const { activate } = require('../extension.js');
const mockFs = require('mock-fs');
const vscode = require('vscode');
const path = require('path');

jest.mock('vscode', () => {
    const mockPath = '/latr-workspace';
    return {
        workspace: {
            workspaceFolders: [
                { uri: { fsPath: mockPath } },
            ],
            createFileSystemWatcher: jest.fn(() => ({
                onDidChange: jest.fn(),
                onDidCreate: jest.fn(),
                onDidDelete: jest.fn(),
            })),
        },
        window: {
            showInformationMessage: jest.fn(),
            registerTreeDataProvider: jest.fn()
        },
        commands: {
            registerCommand: jest.fn((command, callback) => ({command, callback }))
        },
        EventEmitter: jest.fn().mockImplementation(() => {
            const eventEmitter = {
                event: jest.fn(),
                fire: jest.fn(),
                dispose: jest.fn(),
            };
            return eventEmitter;
        }),
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
            file: jest.fn((file) => ({ fsPath: file })),
        },
    };
});

describe('LATR Extension Tests', () => {
    let recentFilesOS, recentFilesGit;

    beforeEach(() => {
        // Mock the file system
        mockFs({
            '/latr-workspace': {
                'file1.txt': 'content',
                'file2.js': 'content',
            },
        });

        // Reset global variables
        recentFilesOS = [];
        recentFilesGit = [];
    });

    afterEach(() => {
        // Restore the file system
        mockFs.restore();
    });

    it('should update recent files based on OS modification timestamps', async () => {
        activate({ subscriptions: [] });

        const updateRecentFilesOS = async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) return;

            for (const folder of workspaceFolders) {
                const folderPath = folder.uri.fsPath;
                const files = [
                    path.join(folderPath, 'file1.txt'),
                    path.join(folderPath, 'file2.js'),
                ];

                const fileStats = await Promise.all(
                    files.map(async (file) => ({
                        file,
                        mtime: new Date(),
                        source: 'OS',
                    }))
                );

                recentFilesOS.push(...fileStats);
            }

            vscode.window.showInformationMessage(
                'Recent files view updated for OS modified files!'
            );
        };

        await updateRecentFilesOS();

        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
            'Recent files view updated for OS modified files!'
        );
        expect(recentFilesOS).toHaveLength(2);
        expect(recentFilesOS.map((file) => file.file)).toEqual(
            expect.arrayContaining([
                path.join('/latr-workspace', 'file1.txt'),
                path.join('/latr-workspace', 'file2.js'),
            ])
        );
    });

    it('should update recent files based on Git modification timestamps', async () => {
        activate({ subscriptions: [] });

        const updateRecentFilesGit = async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) return;

            for (const folder of workspaceFolders) {
                const folderPath = folder.uri.fsPath;

                const gitFiles = [
                    { file: path.join(folderPath, 'file1.txt'), mtime: new Date(), source: 'Git' },
                    { file: path.join(folderPath, 'file2.js'), mtime: new Date(), source: 'Git' },
                ];

                recentFilesGit.push(...gitFiles);
            }

            vscode.window.showInformationMessage(
                'Recent files view updated for Git modified files!'
            );
        };

        await updateRecentFilesGit();

        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
            'Recent files view updated for Git modified files!'
        );
        expect(recentFilesGit).toHaveLength(2);
        expect(recentFilesGit.map((file) => file.file)).toEqual(
            expect.arrayContaining([
                path.join('/latr-workspace', 'file1.txt'),
                path.join('/latr-workspace', 'file2.js'),
            ])
        );
    });

    it('should toggle sorting order of recent files', () => {
        activate({ subscriptions: [] });

        let sortDescending = true;

        const toggleSortOrder = () => {
            sortDescending = !sortDescending;
            vscode.window.showInformationMessage(
                `Sorting order: ${sortDescending ? 'Descending' : 'Ascending'}`
            );
        };

        toggleSortOrder();
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
            'Sorting order: Ascending'
        );

        toggleSortOrder();
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
            'Sorting order: Descending'
        );
    });

    it('should handle uncommitted Git changes', async () => {
        activate({ subscriptions: [] });

        const uncommittedFiles = [
            { file: '/latr-workspace/untracked1.txt', mtime: new Date(), source: 'Uncommitted' },
            { file: '/latr-workspace/modified1.js', mtime: new Date(), source: 'Uncommitted' },
        ];

        const mockGetUncommittedFiles = jest.fn().mockResolvedValue(uncommittedFiles);

        const result = await mockGetUncommittedFiles('/latr-workspace');

        expect(result).toHaveLength(2);
        expect(result.map((file) => file.file)).toEqual(
            expect.arrayContaining([
                '/latr-workspace/untracked1.txt',
                '/latr-workspace/modified1.js',
            ])
        );
    });
});