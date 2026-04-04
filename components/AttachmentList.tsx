'use client'
import { useRef, useState } from 'react'
import { File, Download, X, ImageIcon, FileText, Trash2, Upload } from 'lucide-react'
import { format } from 'date-fns'

interface Attachment {
    id: string
    name: string
    fileUrl: string
    fileType: string | null
    fileSize: number | null
    createdAt: string
}

export default function AttachmentList({
    attachments,
    onDelete,
    onUpload,
    uploading,
}: {
    attachments: Attachment[]
    onDelete: (id: string) => void
    onUpload?: (name: string) => void | Promise<void>
    uploading?: boolean
}) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    const getIcon = (type: string | null) => {
        if (!type) return <File size={18} />
        if (type.includes('image')) return <ImageIcon size={18} color="#10b981" />
        if (type.includes('pdf') || type.includes('text')) return <FileText size={18} color="#6366f1" />
        return <File size={18} color="var(--text-muted)" />
    }

    const formatSize = (bytes: number | null) => {
        if (!bytes) return '—'
        const kb = bytes / 1024
        if (kb > 1024) return (kb / 1024).toFixed(1) + ' MB'
        return kb.toFixed(0) + ' KB'
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Files & Documents</h4>
                {onUpload && (
                    <>
                        <input
                            ref={fileInputRef}
                            type="file"
                            style={{ display: 'none' }}
                            onChange={e => {
                                const file = e.target.files?.[0]
                                if (file) onUpload(file.name)
                                e.target.value = ''
                            }}
                        />
                        <button
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <Upload size={12} />}
                            {uploading ? 'Uploading…' : 'Add File'}
                        </button>
                    </>
                )}
            </div>

            {attachments.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', border: '1.5px dashed var(--border)', borderRadius: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                    No files attached yet.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                    {attachments.map(file => (
                        <div key={file.id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {getIcon(file.fileType)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{file.name}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatSize(file.fileSize)} • {format(new Date(file.createdAt), 'MMM d')}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <a href={file.fileUrl} download target="_blank" className="btn-ghost" style={{ padding: 6 }}>
                                    <Download size={14} color="var(--accent-primary)" />
                                </a>
                                <button onClick={() => setDeleteConfirmId(file.id)} className="btn-ghost" style={{ padding: 6 }}>
                                    <X size={14} color="#ef4444" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {deleteConfirmId && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirmId(null)}>
                    <div className="modal" style={{ maxWidth: 400 }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ width: 64, height: 64, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <Trash2 size={32} />
                            </div>
                            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Delete Attachment</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                                Are you sure you want to permanently delete this file? This action cannot be undone.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: '12px 0' }}>Cancel</button>
                            <button className="btn-primary" onClick={() => { onDelete(deleteConfirmId); setDeleteConfirmId(null) }} style={{ flex: 1, padding: '12px 0', background: '#ef4444', borderColor: '#ef4444' }}>
                                Yes, Delete File
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
