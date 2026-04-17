'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { MessageSquare, Send, Trash2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Note {
    id: string
    content: string
    createdAt: string
    user: { id: string; name: string }
}

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899']

function getColor(name: string) {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString()
}

export default function LeadNotes({ leadId, currentUserId, isAdmin }: { leadId: string; currentUserId: string; isAdmin?: boolean }) {
    const { data, mutate } = useSWR<{ notes: Note[] }>(`/api/leads/${leadId}/notes`, fetcher)
    const [newNote, setNewNote] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)

    const handleSubmit = async () => {
        if (!newNote.trim() || submitting) return
        setSubmitting(true)
        try {
            const res = await fetch(`/api/leads/${leadId}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newNote.trim() })
            })
            if (!res.ok) throw new Error('Failed')
            setNewNote('')
            mutate()
        } catch { /* toast? */ }
        finally { setSubmitting(false) }
    }

    const handleDelete = async (noteId: string) => {
        if (deleting) return
        setDeleting(noteId)
        try {
            const res = await fetch(`/api/leads/${leadId}/notes`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ noteId })
            })
            if (!res.ok) throw new Error('Failed')
            mutate()
        } catch { /* toast? */ }
        finally { setDeleting(null) }
    }

    const notes = data?.notes || []

    return (
        <div style={{ marginTop: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <MessageSquare size={14} color="var(--accent-primary)" />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Notes</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>({notes.length})</span>
            </div>

            {/* Compose */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Add a note..."
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
                    style={{
                        flex: 1, padding: '10px 12px', borderRadius: 10,
                        border: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)',
                        color: 'var(--text-primary)', fontSize: 12, fontWeight: 500,
                        resize: 'vertical', minHeight: 60, maxHeight: 200,
                        outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                    }}
                />
                <button
                    onClick={handleSubmit}
                    disabled={!newNote.trim() || submitting}
                    style={{
                        width: 38, borderRadius: 10, border: 'none',
                        background: newNote.trim() ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                        color: 'white', cursor: newNote.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: newNote.trim() ? 1 : 0.4, transition: 'all 0.2s',
                        alignSelf: 'flex-end', height: 38
                    }}
                >
                    <Send size={14} />
                </button>
            </div>

            {/* Notes List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notes.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>
                        No notes yet. Be the first to add one.
                    </div>
                ) : (
                    notes.map(note => {
                        const canDelete = note.user.id === currentUserId || isAdmin
                        const color = getColor(note.user.name)
                        return (
                            <div key={note.id} style={{
                                display: 'flex', gap: 10, padding: '10px 12px',
                                background: 'rgba(0,0,0,0.1)', borderRadius: 10,
                                border: '1px solid rgba(255,255,255,0.03)',
                                transition: 'border-color 0.2s'
                            }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: `${color}20`, border: `1px solid ${color}40`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 9, fontWeight: 800, color, flexShrink: 0
                                }}>
                                    {getInitials(note.user.name)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{note.user.name}</span>
                                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(note.createdAt)}</span>
                                        </div>
                                        {canDelete && (
                                            <button
                                                onClick={() => handleDelete(note.id)}
                                                disabled={deleting === note.id}
                                                style={{
                                                    background: 'transparent', border: 'none',
                                                    color: 'var(--text-muted)', cursor: 'pointer',
                                                    padding: 2, opacity: deleting === note.id ? 0.3 : 0.5,
                                                    transition: 'opacity 0.2s'
                                                }}
                                                onMouseEnter={e => (e.target as HTMLElement).style.opacity = '1'}
                                                onMouseLeave={e => (e.target as HTMLElement).style.opacity = '0.5'}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {note.content}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
