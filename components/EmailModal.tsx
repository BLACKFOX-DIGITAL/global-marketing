'use client'
import { useState, useEffect } from 'react'
import { X, Send, Loader2, Eye, Edit3 } from 'lucide-react'

interface Template {
    id: string
    name: string
    subject: string
    body: string
}

interface EmailModalProps {
    leadId: string
    leadName: string
    leadEmail: string
    onClose: () => void
    onSuccess: () => void
}

export default function EmailModal({ leadId, leadName, leadEmail, onClose, onSuccess }: EmailModalProps) {
    const [templates, setTemplates] = useState<Template[]>([])
    const [selectedTemplateId, setSelectedTemplateId] = useState('')
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const [preview, setPreview] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)

    useEffect(() => {
        fetch('/api/admin/email-templates')
            .then(res => res.json())
            .then(data => {
                setTemplates(data.templates || [])
                setFetching(false)
            })
            .catch(() => setFetching(false))
    }, [])

    const handleTemplateChange = (id: string) => {
        const template = templates.find(t => t.id === id)
        if (template) {
            setSelectedTemplateId(id)
            setSubject(template.subject.replace('{{name}}', leadName))
            setBody(template.body.replace('{{name}}', leadName))
        } else {
            setSelectedTemplateId('')
        }
    }

    const handleSend = async () => {
        if (!subject || !body) return
        setLoading(true)
        try {
            const res = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId, subject, body })
            })
            const data = await res.json()
            if (res.ok) {
                onSuccess()
                onClose()
            } else {
                alert(data.error || 'Failed to send email')
            }
        } catch (err) {
            alert('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal glass" style={{ maxWidth: 800, width: '90%', padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Send Email to {leadName}</h3>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{leadEmail}</p>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: 4 }}><X size={20} /></button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', height: 500 }}>
                    {/* Sidebar: Templates */}
                    <div style={{ borderRight: '1px solid var(--border)', padding: 16, background: 'rgba(0,0,0,0.1)', overflowY: 'auto' }}>
                        <h4 style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.5px' }}>Templates</h4>
                        {fetching ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Loader2 size={16} className="spinner" /></div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <button
                                    onClick={() => handleTemplateChange('')}
                                    style={{
                                        textAlign: 'left', padding: '10px 12px', borderRadius: 8, fontSize: 13, border: 'none',
                                        background: selectedTemplateId === '' ? 'var(--accent-primary)' : 'transparent',
                                        color: selectedTemplateId === '' ? 'white' : 'var(--text-secondary)',
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    Blank Canvas
                                </button>
                                {templates.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => handleTemplateChange(t.id)}
                                        style={{
                                            textAlign: 'left', padding: '10px 12px', borderRadius: 8, fontSize: 13, border: 'none',
                                            background: selectedTemplateId === t.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
                                            color: selectedTemplateId === t.id ? 'white' : 'var(--text-primary)',
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Main Content */}
                    <div style={{ display: 'flex', flexDirection: 'column', padding: 24, gap: 16, overflowY: 'auto' }}>
                        <div className="form-group">
                            <label className="form-label">Subject</label>
                            <input
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                placeholder="Enter email subject..."
                                style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid var(--border)' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="form-label" style={{ margin: 0 }}>Message Content (HTML)</label>
                            <button
                                onClick={() => setPreview(!preview)}
                                className="btn-ghost"
                                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-cyan)' }}
                            >
                                {preview ? <><Edit3 size={14} /> Back to Edit</> : <><Eye size={14} /> Preview HTML</>}
                            </button>
                        </div>

                        {preview ? (
                            <div
                                style={{
                                    flex: 1, background: 'white', borderRadius: 10, padding: 20, color: '#333',
                                    overflowY: 'auto', border: '1px solid var(--border)', minHeight: 200
                                }}
                                dangerouslySetInnerHTML={{ __html: body }}
                            />
                        ) : (
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                rows={12}
                                placeholder="Write your message here. You can use HTML tags."
                                style={{
                                    flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 16,
                                    color: 'white', border: '1px solid var(--border)', fontSize: 14, fontFamily: 'monospace'
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'rgba(255,255,255,0.02)' }}>
                    <button onClick={onClose} className="btn-secondary" style={{ borderRadius: 10 }}>Cancel</button>
                    <button
                        onClick={handleSend}
                        disabled={loading || !subject || !body}
                        className="btn-primary"
                        style={{ borderRadius: 10, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                        {loading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
                        Send Email
                    </button>
                </div>
            </div>
        </div>
    )
}
