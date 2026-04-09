import React, { useState } from 'react';
import { create } from 'zustand';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderTree, FileCode, Split, Save as SaveIcon } from 'lucide-react';
// import { FixedSizeList as List } from 'react-window';
import ReactDiffViewer from 'react-diff-viewer-continued';

// Zustand Store for Layout configuration
const useWorkbenchStore = create((set) => ({
    sidebarWidth: 300,
    setSidebarWidth: (width) => set({ sidebarWidth: width }),
    viewMode: 'raw', // 'raw' | 'diff'
    setViewMode: (mode) => set({ viewMode: mode })
}));

/**
 * FileViewer Component handles the actual fetching and rendering
 * of the currently selected file.
 */
function FileViewer({ path, viewMode }) {
    const [localContent, setLocalContent] = React.useState('');
    const queryClient = useQueryClient();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['workbench-file', path],
        queryFn: async () => {
            const res = await fetch(`/api/workbench/file?path=${encodeURIComponent(path)}`);
            if (!res.ok) throw new Error('File read blocked or invalid');
            const json = await res.json();
            setLocalContent(json.raw || '');
            return json;
        },
        enabled: !!path && path.length > 0
    });

    const saveMutation = useMutation({
        mutationFn: async (content) => {
            const res = await fetch('/api/workbench/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, content })
            });
            if (!res.ok) throw new Error('Failed to save file');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workbench-file', path] })
            alert('File saved successfully!');
        }
    });

    // Expose the save function globally so the header button can trigger it
    React.useEffect(() => {
        window.__triggerWorkbenchSave = () => saveMutation.mutate(localContent);
        return () => delete window.__triggerWorkbenchSave;
    }, [localContent, saveMutation]);

    if (!path) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                <FolderTree size={48} opacity={0.2} style={{ marginBottom: '16px' }} />
                <p>Select a file from the workspace explorer to view its contents.</p>
            </div>
        );
    }

    if (isLoading) return <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Reading {path}...</div>;
    if (isError) return <div style={{ padding: '24px', color: 'var(--danger)' }}>Failed to read {path}. Verify permissions.</div>;

    if (viewMode === 'raw') {
        return (
            <textarea 
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                style={{ 
                    width: '100%', height: '100%', border: 'none', background: 'transparent',
                    color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '14px',
                    padding: '24px', resize: 'none', outline: 'none'
                }}
            />
        );
    }

    // Skeleton for Diff Mode
    return (
        <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
            <ReactDiffViewer 
                oldValue={data?.raw || ''} 
                newValue={localContent} 
                splitView={true} 
                useDarkTheme={true}
                styles={{
                    variables: {
                        dark: {
                            diffViewerBackground: 'var(--bg-primary)',
                            addedBackground: '#044B29',
                            removedBackground: '#632F34',
                            wordAddedBackground: '#055D33',
                            wordRemovedBackground: '#7D383F',
                        }
                    }
                }}
            />
        </div>
    );
}

export default function Workbench() {
    const { sidebarWidth, viewMode, setViewMode } = useWorkbenchStore();
    const [selectedPath, setSelectedPath] = useState('');

    // Fetch the directory tree using the G2 protected backend endpoint
    const { data: treeData, isLoading } = useQuery({
        queryKey: ['workbench-tree'],
        queryFn: async () => {
            const res = await fetch('/api/workbench/tree?path=');
            if (!res.ok) throw new Error('Failed to load tree');
            return res.json();
        }
    });

    // Recursively render the tree 
    const renderTree = (nodes) => {
        return nodes.map((node, index) => (
            <div key={`${node.path}-${index}`} style={{ paddingLeft: '12px' }}>
                <div 
                    onClick={() => node.type === 'file' && setSelectedPath(node.path)}
                    style={{ 
                        padding: '6px', cursor: 'pointer', borderRadius: '4px',
                        background: selectedPath === node.path ? 'var(--accent)' : 'transparent',
                        color: selectedPath === node.path ? 'var(--bg-primary)' : 'inherit',
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                >
                    {node.type === 'dir' ? <FolderTree size={16}/> : <FileCode size={16}/>}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
                </div>
                {node.children && (
                    <div style={{ borderLeft: '1px solid var(--border-color)', marginLeft: '12px', marginTop: '4px' }}>
                        {renderTree(node.children)}
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
            
            {/* Sidebar: File Explorer */}
            <div style={{
                width: `${sidebarWidth}px`, borderRight: '1px solid var(--border-color)', 
                background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FolderTree size={18} color="var(--accent)" /> workspace
                    </h2>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px', fontSize: '0.9rem' }}>
                    {isLoading ? <span style={{color: 'var(--text-muted)'}}>Scanning filesystem...</span> : 
                        treeData?.tree ? renderTree(treeData.tree) : null}
                </div>
            </div>

            {/* Main Editor / Diff Viewer Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <header style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 500, fontSize: '0.95rem', color: selectedPath ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {selectedPath || 'No file selected'}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {selectedPath && (
                            <button 
                                onClick={() => window.__triggerWorkbenchSave && window.__triggerWorkbenchSave()}
                                style={{ 
                                    background: 'var(--accent)', 
                                    border: 'none', borderRadius: '4px', padding: '6px 14px', 
                                    color: 'var(--bg-primary)', cursor: 'pointer', transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600
                                }}
                            ><SaveIcon size={16} /> Save File</button>
                        )}
                        <span style={{ borderLeft: '1px solid var(--border-color)', margin: '0 8px' }}></span>
                        
                        <button 
                            onClick={() => setViewMode('raw')}
                            style={{ 
                                background: viewMode === 'raw' ? 'var(--bg-elevated)' : 'transparent', 
                                border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px 14px', 
                                color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >Raw Viewer</button>
                        <button 
                            onClick={() => setViewMode('diff')}
                            style={{ 
                                background: viewMode === 'diff' ? 'var(--bg-elevated)' : 'transparent', 
                                border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px 14px', 
                                color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >Diff Compare</button>
                    </div>
                </header>

                <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <FileViewer path={selectedPath} viewMode={viewMode} />
                </main>
            </div>

        </div>
    );
}
