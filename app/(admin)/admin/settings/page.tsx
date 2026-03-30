'use client'
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Check, X, GripVertical, Settings, Activity, Database, Clock, Waves, Briefcase, Zap, Users, Mail, Palmtree, Ban, ShieldAlert } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface SystemOption { id: string; category: string; value: string; color: string | null; order: number }
interface TeamMember { id: string; name: string; email: string; role: string; createdAt: string; baseSalary: number; resendSenderEmail?: string | null; isSuspended: boolean }
interface EmailTemplate { id: string; name: string; subject: string; body: string; createdAt: string }
interface Holiday { id: string; name: string; description: string | null; date: string }

const SETTINGS_GROUPS = [
    {
        name: 'Definitions',
        categories: [
            { id: 'LEAD_STATUS', label: 'Lead Statuses', icon: Activity },
            { id: 'LEAD_INDUSTRY', label: 'Lead Industries', icon: Database },
            { id: 'LEAD_POSITION', label: 'Lead Positions', icon: Users },
            { id: 'OPPORTUNITY_STAGE', label: 'Opportunity Stages', icon: Zap },
            { id: 'TASK_PRIORITY', label: 'Task Priorities', icon: Briefcase },
            { id: 'LEAVE_TYPE', label: 'Leave Types', icon: Clock },
        ]
    },
    {
        name: 'Operation',
        categories: [
            { id: 'TEAM_MEMBERS', label: 'Team Members', icon: Users },
            { id: 'HOLIDAYS', label: 'Company Holidays', icon: Palmtree },
        ]
    },
    {
        name: 'Logic & Rules',
        categories: [
            { id: 'LEAD_POOL', label: 'Lead Reassignment', icon: Waves },
            { id: 'GAMIFICATION', label: 'Gamification & XP', icon: Zap },
        ]
    },
    {
        name: 'Connections',
        categories: [
            { id: 'EMAIL_INTEGRATION', label: 'Email Integration', icon: Mail }
        ]
    }
]

const CATEGORIES = SETTINGS_GROUPS.flatMap(g => g.categories)

export default function AdminSettings() {
    const [options, setOptions] = useState<SystemOption[]>([])
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [holidays, setHolidays] = useState<Holiday[]>([])
    const [templates, setTemplates] = useState<EmailTemplate[]>([])
    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [processing, setProcessing] = useState<string | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [configs, setConfigs] = useState<Record<string, string>>({
        RECYCLE_DAYS: '60', CLAIM_LIMIT: '10', RESEND_API_KEY: '', RESEND_WEBHOOK_SECRET: '',
        RECLAIM_HIGH: '7', WARN_HIGH: '5',
        RECLAIM_MEDIUM: '14', WARN_MEDIUM: '12',
        RECLAIM_LOW: '21', WARN_LOW: '19',
        XP_CALL_ATTEMPT: '15', XP_MAIL_ATTEMPT: '10', XP_TASK_COMPLETED: '10', XP_LEAD_CONVERTED: '50', XP_OPPORTUNITY_WON: '100', XP_POOL_CLAIM: '5',
        XP_LEAD_CREATED: '5', XP_TASK_CREATED: '3',
    })

    const [adding, setAdding] = useState(false)
    const [newValue, setNewValue] = useState('')
    const [newColor, setNewColor] = useState('#3b82f6')

    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
    const [editColor, setEditColor] = useState('')

    const [editingUser, setEditingUser] = useState<TeamMember | null>(null)
    const [editUserName, setEditUserName] = useState('')
    const [editUserEmail, setEditUserEmail] = useState('')
    const [editUserRole, setEditUserRole] = useState('')
    const [editUserSalary, setEditUserSalary] = useState(0)
    const [editUserSenderEmail, setEditUserSenderEmail] = useState('')
    const [editUserPassword, setEditUserPassword] = useState('')

    const [newUserName, setNewUserName] = useState('')
    const [newUserEmail, setNewUserEmail] = useState('')
    const [newUserPassword, setNewUserPassword] = useState('')
    const [newUserRole, setNewUserRole] = useState('Sales Rep')
    const [newUserSalary, setNewUserSalary] = useState(0)

    const [templateId, setTemplateId] = useState<string | null>(null)
    const [templateName, setTemplateName] = useState('')
    const [templateSubject, setTemplateSubject] = useState('')
    const [templateBody, setTemplateBody] = useState('')

    const [holidayName, setHolidayName] = useState('')
    const [holidayDate, setHolidayDate] = useState('')
    const [holidayDesc, setHolidayDesc] = useState('')

    async function fetchData() {
        setLoading(true)
        try {
            const [optsRes, configRes, usersRes, holidayRes, templatesRes] = await Promise.all([
                fetch(`/api/admin/settings`), fetch(`/api/admin/config`), fetch(`/api/admin/users`), fetch(`/api/admin/holidays`), fetch(`/api/admin/email-templates`)
            ])
            if (optsRes.ok) setOptions((await optsRes.json()).options)
            else if (optsRes.status === 403) setError('Only System Admins can access configuration settings.')
            if (configRes.ok) { const d = await configRes.json(); setConfigs(prev => ({ ...prev, ...d.settings })) }
            if (usersRes.ok) setTeamMembers((await usersRes.json()).users)
            if (holidayRes.ok) setHolidays((await holidayRes.json()).holidays)
            if (templatesRes.ok) setTemplates((await templatesRes.json()).templates)
        } catch { setError('Failed to fetch data.') } finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [])

    const filteredOptions = options.filter(o => o.category === activeCategory).sort((a, b) => a.order - b.order)

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        setProcessing('add')
        const order = filteredOptions.length > 0 ? Math.max(...filteredOptions.map(o => o.order)) + 1 : 0
        const res = await fetch('/api/admin/settings', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: activeCategory, value: newValue, color: newColor, order })
        })
        if (res.ok) { setOptions([...options, await res.json()]); setAdding(false); setNewValue(''); setNewColor('#3b82f6') }
        else alert((await res.json()).error || 'Failed to add option')
        setProcessing(null)
    }

    async function handleUpdateConfig(key: string, value: string) {
        setProcessing(key)
        const res = await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) })
        if (res.ok) setConfigs(prev => ({ ...prev, [key]: value }))
        setProcessing(null)
    }

    async function handleEditSave() {
        if (!editingId) return
        setProcessing(editingId)
        const res = await fetch(`/api/admin/settings/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: editValue, color: editColor }) })
        if (res.ok) { const updated = await res.json(); setOptions(options.map(o => o.id === editingId ? updated : o)); setEditingId(null) }
        setProcessing(null)
    }

    async function handleDelete(id: string) {
        setProcessing(id)
        if ((await fetch(`/api/admin/settings/${id}`, { method: 'DELETE' })).ok) { setOptions(options.filter(o => o.id !== id)); setDeleteConfirmId(null) }
        setProcessing(null)
    }

    async function handleUserUpdate() {
        if (!editingUser) return
        setProcessing(editingUser.id)
        const res = await fetch(`/api/admin/users`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                id: editingUser.id, 
                name: editUserName, 
                email: editUserEmail, 
                role: editUserRole, 
                baseSalary: editUserSalary, 
                resendSenderEmail: editUserSenderEmail,
                password: editUserPassword || undefined
            }) 
        })
        if (res.ok) { 
            const updated = await res.json()
            setTeamMembers(teamMembers.map(u => u.id === updated.id ? { ...u, ...updated } : u))
            setEditingUser(null)
            setEditUserPassword('')
        }
        setProcessing(null)
    }

    async function handleAddUser(e: React.FormEvent) {
        e.preventDefault()
        setProcessing('add-user')
        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newUserName,
                email: newUserEmail,
                password: newUserPassword,
                role: newUserRole,
                baseSalary: newUserSalary
            })
        })
        if (res.ok) {
            const newUser = await res.json()
            setTeamMembers(prev => [...prev, newUser].sort((a, b) => a.name.localeCompare(b.name)))
            setAdding(false)
            setNewUserName('')
            setNewUserEmail('')
            setNewUserPassword('')
            setNewUserRole('Sales Rep')
            setNewUserSalary(0)
        } else {
            alert((await res.json()).error || 'Failed to create user')
        }
        setProcessing(null)
    }

    async function handleUserDelete(id: string) {
        if (!confirm('Are you sure you want to delete this team member? This action cannot be undone.')) return
        setProcessing(id)
        const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
        if (res.ok) {
            setTeamMembers(teamMembers.filter(u => u.id !== id))
        } else {
            const data = await res.json()
            alert(data.error || 'Failed to delete user')
        }
        setProcessing(null)
    }

    async function handleUserSuspend(id: string, currentlySuspended: boolean) {
        if (!confirm(`Are you sure you want to ${currentlySuspended ? 'unsuspend' : 'suspend'} this team member?`)) return
        setProcessing(id)
        const res = await fetch(`/api/admin/users`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ id, isSuspended: !currentlySuspended }) 
        })
        if (res.ok) {
            const updated = await res.json()
            setTeamMembers(teamMembers.map(u => u.id === updated.id ? { ...u, isSuspended: updated.isSuspended } : u))
        }
        setProcessing(null)
    }

    async function handleAddHoliday(e: React.FormEvent) {
        e.preventDefault(); setProcessing('add-holiday')
        const res = await fetch('/api/admin/holidays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: holidayName, date: holidayDate, description: holidayDesc }) })
        if (res.ok) { setHolidays([...holidays, await res.json()].sort((a,b)=>new Date(a.date).getTime() - new Date(b.date).getTime())); setAdding(false); setHolidayName(''); setHolidayDate(''); setHolidayDesc('') }
        setProcessing(null)
    }

    async function handleDeleteHoliday(id: string) {
        setProcessing(id); if ((await fetch(`/api/admin/holidays/${id}`, { method: 'DELETE' })).ok) setHolidays(holidays.filter(h => h.id !== id)); setProcessing(null)
    }

    async function handleSaveTemplate(e: React.FormEvent) {
        e.preventDefault(); setProcessing('template')
        const res = await fetch(templateId ? `/api/admin/email-templates/${templateId}` : '/api/admin/email-templates', { method: templateId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: templateName, subject: templateSubject, body: templateBody }) })
        if (res.ok) { await fetchData(); setAdding(false); setTemplateId(null); setTemplateName(''); setTemplateSubject(''); setTemplateBody('') }
        setProcessing(null)
    }

    async function handleDeleteTemplate(id: string) {
        if(confirm('Delete template?')) { setProcessing(id); if((await fetch(`/api/admin/email-templates/${id}`, { method: 'DELETE' })).ok) setTemplates(templates.filter(t => t.id !== id)); setProcessing(null) }
    }

    async function handleImportDefaults() {
        if (!confirm('This will add all original standard job positions to your list. Continue?')) return
        setProcessing('import-defaults')
        
        const POSITIONS = [
            "Retoucher", "Senior Retoucher", "Image Editor", "Photo Editor", "E-commerce Retoucher", 
            "High-End Retoucher", "Colorist", "Art Director", "Creative Director", "Studio Manager", 
            "Production Manager", "Photography Assistant", "Quality Control Specialist", "Visual Merchandiser", 
            "CEO", "Founder", "Co-Founder", "Owner", "President", "Managing Director", 
            "Operations Manager", "General Manager", "Project Manager", "Account Manager", "Marketing Manager"
        ]

        const existingValues = filteredOptions.map(o => o.value.toLowerCase())
        const toAdd = POSITIONS.filter(p => !existingValues.includes(p.toLowerCase()))

        if (toAdd.length === 0) {
            alert('All standard positions are already present.')
            setProcessing(null)
            return
        }

        let addedCount = 0
        for (const val of toAdd) {
            const order = filteredOptions.length + addedCount
            const res = await fetch('/api/admin/settings', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: 'LEAD_POSITION', value: val, color: '#6366f1', order })
            })
            if (res.ok) addedCount++
        }

        await fetchData()
        alert(`Successfully imported ${addedCount} standard positions.`)
        setProcessing(null)
    }

    if (error) return <div style={{ padding: 40, textAlign: 'center' }}>{error}</div>

    return (
        <div style={{ padding: '40px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: 'var(--text-primary)' }}>System Settings</h1>
                <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>Global configurations, taxonomies, and team governance.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32 }}>
                
                {/* Minimalist Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {SETTINGS_GROUPS.map(group => (
                        <div key={group.name}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12, paddingLeft: 12 }}>
                                {group.name}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {group.categories.map(cat => {
                                    const active = activeCategory === cat.id
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => { setActiveCategory(cat.id); setAdding(false) }}
                                            style={{
                                                width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8,
                                                background: active ? 'var(--bg-card)' : 'transparent',
                                                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: active ? 600 : 500,
                                                cursor: 'pointer', transition: 'all 0.1s', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                                border: active ? '1px solid var(--border)' : '1px solid transparent'
                                            }}
                                        >
                                            <cat.icon size={16} style={{ color: active ? 'var(--accent-primary)' : 'inherit' }} />
                                            {cat.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Content Area */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, minHeight: 600 }}>
                    <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{CATEGORIES.find(c => c.id === activeCategory)?.label}</h2>
                        <div style={{ display: 'flex', gap: 12 }}>
                            {activeCategory === 'LEAD_POSITION' && !adding && (
                                <button 
                                    onClick={handleImportDefaults} 
                                    disabled={processing === 'import-defaults'}
                                    style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                                >
                                    {processing === 'import-defaults' ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Database size={14} />}
                                    Restore Original Defaults
                                </button>
                            )}
                            {activeCategory === 'TEAM_MEMBERS' ? (
                                !adding && <button onClick={() => setAdding(true)} className="btn-primary" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}><Plus size={14} style={{ marginRight: 6 }} /> New Member</button>
                            ) : activeCategory === 'EMAIL_INTEGRATION' ? (
                                !adding && <button onClick={() => { setAdding(true); setTemplateId(null); setTemplateName(''); setTemplateSubject(''); setTemplateBody('') }} className="btn-primary" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}><Plus size={14} style={{ marginRight: 6 }} /> New Template</button>
                            ) : activeCategory === 'HOLIDAYS' ? (
                                !adding && <button onClick={() => setAdding(true)} className="btn-primary" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}><Plus size={14} style={{ marginRight: 6 }} /> Add Holiday</button>
                            ) : (
                                !adding && <button onClick={() => setAdding(true)} className="btn-primary" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}><Plus size={14} style={{ marginRight: 6 }} /> Add Option</button>
                            )}
                        </div>
                    </div>

                    <div style={{ padding: 32 }}>
                        {loading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
                        ) : activeCategory === 'LEAD_POOL' ? (
                            <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 32 }}>
                                <div>
                                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Reassignment Rules (Priority-Based)</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                        <div style={{ background: 'var(--bg-main)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                                                <h5 style={{ fontSize: 13, fontWeight: 700 }}>High Priority</h5>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Warning at (Days)</label>
                                                    <input type="number" value={configs.WARN_HIGH} onChange={e => handleUpdateConfig('WARN_HIGH', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }} />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Reclaim at (Days)</label>
                                                    <input type="number" value={configs.RECLAIM_HIGH} onChange={e => handleUpdateConfig('RECLAIM_HIGH', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ background: 'var(--bg-main)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                                                <h5 style={{ fontSize: 13, fontWeight: 700 }}>Medium Priority</h5>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Warning at (Days)</label>
                                                    <input type="number" value={configs.WARN_MEDIUM} onChange={e => handleUpdateConfig('WARN_MEDIUM', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }} />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Reclaim at (Days)</label>
                                                    <input type="number" value={configs.RECLAIM_MEDIUM} onChange={e => handleUpdateConfig('RECLAIM_MEDIUM', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ background: 'var(--bg-main)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                                                <h5 style={{ fontSize: 13, fontWeight: 700 }}>Low Priority</h5>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Warning at (Days)</label>
                                                    <input type="number" value={configs.WARN_LOW} onChange={e => handleUpdateConfig('WARN_LOW', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }} />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Reclaim at (Days)</label>
                                                    <input type="number" value={configs.RECLAIM_LOW} onChange={e => handleUpdateConfig('RECLAIM_LOW', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Lost Lead Recovery (Days)</label>
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Time before a Lost lead returns to the open pool for another try.</p>
                                            <input type="number" value={configs.RECYCLE_DAYS} onChange={e => handleUpdateConfig('RECYCLE_DAYS', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Quota Constraints</h4>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Maximum Active Claims per Rep</label>
                                        <input type="number" value={configs.CLAIM_LIMIT} onChange={e => handleUpdateConfig('CLAIM_LIMIT', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} />
                                    </div>
                                </div>
                            </div>
                        ) : activeCategory === 'GAMIFICATION' ? (
                            <div style={{ maxWidth: 800 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                    {[
                                        { key: 'CALL_ATTEMPT', label: '📞 Log a Call', desc: 'Calling a lead' },
                                        { key: 'MAIL_ATTEMPT', label: '✉️ Send a Mail', desc: 'Emailing a lead' },
                                        { key: 'TASK_COMPLETED', label: '✅ Complete a Task', desc: 'Marking a task done' },
                                        { key: 'TASK_CREATED', label: '📝 Create a Task', desc: 'Adding a new task' },
                                        { key: 'LEAD_CREATED', label: '➕ Create a Lead', desc: 'Adding a new lead' },
                                        { key: 'LEAD_CONVERTED', label: '🔄 Convert a Lead', desc: 'Lead → Opportunity' },
                                        { key: 'OPPORTUNITY_WON', label: '🏆 Win an Opportunity', desc: 'Closing a deal' },
                                        { key: 'POOL_CLAIM', label: '🎣 Claim from Pool', desc: 'Claiming a pooled lead' },
                                    ].map(({ key, label, desc }) => (
                                        <div key={key} style={{ background: 'var(--bg-main)', borderRadius: 10, padding: '16px 20px', border: '1px solid var(--border)' }}>
                                            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{label}</label>
                                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{desc}</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input type="number" value={configs[`XP_${key}`]} onChange={e => handleUpdateConfig(`XP_${key}`, e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }} />
                                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>XP</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : activeCategory === 'TEAM_MEMBERS' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {adding && (
                                    <form onSubmit={handleAddUser} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 12, background: 'var(--bg-main)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Name</label><input value={newUserName} onChange={e => setNewUserName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }} /></div>
                                            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Email</label><input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }} /></div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Initial Password</label><input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }} /></div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Role</label>
                                                <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }}>
                                                    <option value="Sales Rep">Sales Rep</option>
                                                    <option value="Administrator">Administrator</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div style={{ marginBottom: 16 }}>
                                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Base Salary (৳)</label>
                                            <input type="number" value={newUserSalary} onChange={e => setNewUserSalary(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }} />
                                        </div>
                                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                            <button type="button" onClick={() => setAdding(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                                            <button type="submit" disabled={processing === 'add-user'} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent-primary)', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Create Member</button>
                                        </div>
                                    </form>
                                )}
                                {teamMembers.map(member => (
                                    <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-main)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>{member.name.substring(0,2).toUpperCase()}</div>
                                            <div>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{member.name}</span>
                                                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', fontWeight: 600 }}>{member.role}</span>
                                                    {member.isSuspended && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Ban size={10} /> Suspended</span>}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{member.email}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => { setEditingUser(member); setEditUserName(member.name); setEditUserEmail(member.email); setEditUserRole(member.role); setEditUserSalary(member.baseSalary || 0); setEditUserSenderEmail(member.resendSenderEmail || ''); setEditUserPassword('') }} style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                                            <button 
                                                onClick={() => handleUserSuspend(member.id, member.isSuspended)} 
                                                disabled={processing === member.id}
                                                style={{ 
                                                    padding: '6px 12px', 
                                                    border: `1px solid ${member.isSuspended ? '#10b98133' : '#f59e0b33'}`, 
                                                    borderRadius: 6, 
                                                    background: 'transparent', 
                                                    color: member.isSuspended ? '#10b981' : '#f59e0b', 
                                                    fontSize: 12, 
                                                    fontWeight: 600, 
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}
                                            >
                                                {member.isSuspended ? <Check size={14} /> : <Ban size={14} />}
                                                {member.isSuspended ? 'Unsuspend' : 'Suspend'}
                                            </button>
                                            <button 
                                                onClick={() => handleUserDelete(member.id)} 
                                                disabled={processing === member.id}
                                                style={{ 
                                                    padding: '6px 12px', 
                                                    border: '1px solid #ef444433', 
                                                    borderRadius: 6, 
                                                    background: 'transparent', 
                                                    color: '#ef4444', 
                                                    fontSize: 12, 
                                                    fontWeight: 600, 
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}
                                            >
                                                <Trash2 size={14} />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : activeCategory === 'EMAIL_INTEGRATION' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                                <div style={{ maxWidth: 600 }}>
                                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Resend API Detail</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>API Key</label>
                                            <input type="password" value={configs.RESEND_API_KEY} onChange={e => handleUpdateConfig('RESEND_API_KEY', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Webhook Secret</label>
                                            <input type="password" value={configs.RESEND_WEBHOOK_SECRET} onChange={e => handleUpdateConfig('RESEND_WEBHOOK_SECRET', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} />
                                        </div>
                                    </div>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 32 }}>
                                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Templates</h4>
                                    {adding && (
                                        <form onSubmit={handleSaveTemplate} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24, background: 'var(--bg-main)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Name</label><input value={templateName} onChange={e => setTemplateName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }} /></div>
                                                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Subject</label><input value={templateSubject} onChange={e => setTemplateSubject(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }} /></div>
                                            </div>
                                            <div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>HTML Body</label><textarea value={templateBody} onChange={e => setTemplateBody(e.target.value)} required rows={5} style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', outline: 'none', resize: 'none' }} /></div>
                                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                                <button type="button" onClick={() => setAdding(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                                                <button type="submit" disabled={processing === 'template'} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent-primary)', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Save</button>
                                            </div>
                                        </form>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {templates.map(t => (
                                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-main)' }}>
                                                <div><div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.subject}</div></div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => { setAdding(true); setTemplateId(t.id); setTemplateName(t.name); setTemplateSubject(t.subject); setTemplateBody(t.body) }} style={{ padding: 8, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteTemplate(t.id)} style={{ padding: 8, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : activeCategory === 'HOLIDAYS' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {adding && (
                                     <form onSubmit={handleAddHoliday} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 8, background: 'var(--bg-main)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Name</label><input value={holidayName} onChange={e => setHolidayName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }} /></div>
                                            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Date</label><input type="date" value={holidayDate} onChange={e => setHolidayDate(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }} /></div>
                                        </div>
                                        <div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Description</label><input value={holidayDesc} onChange={e => setHolidayDesc(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }} /></div>
                                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                            <button type="button" onClick={() => setAdding(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                                            <button type="submit" disabled={processing === 'add-holiday'} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent-primary)', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Save</button>
                                        </div>
                                     </form>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                                    {holidays.map(h => (
                                        <div key={h.id} style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-main)', position: 'relative' }}>
                                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{h.name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--accent-primary)', marginTop: 2 }}>{format(parseISO(h.date), 'MMMM dd, yyyy')}</div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteHoliday(h.id)} style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {adding && (
                                    <form onSubmit={handleAdd} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-main)', marginBottom: 8 }}>
                                        <input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Option Name" required style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'white', outline: 'none' }} />
                                        <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ padding: 0, width: 44, height: 40, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'transparent' }} />
                                        <button type="button" onClick={() => setAdding(false)} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                                        <button type="submit" disabled={processing === 'add'} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-primary)', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Save</button>
                                    </form>
                                )}
                                {filteredOptions.length === 0 ? <div style={{ color: 'var(--text-muted)' }}>No options defined.</div> : filteredOptions.map(opt => (
                                    <div key={opt.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-main)' }}>
                                        {editingId === opt.id ? (
                                            <div style={{ display: 'flex', gap: 12, flex: 1, alignItems: 'center' }}>
                                                <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'white', outline: 'none' }} />
                                                <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ padding: 0, width: 36, height: 36, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                                                <button onClick={handleEditSave} style={{ border: 'none', background: 'transparent', color: 'var(--accent-emerald)', cursor: 'pointer' }}><Check size={18} /></button>
                                                <button onClick={() => setEditingId(null)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><X size={18} /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: opt.color || '#3b82f6' }} />
                                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{opt.value}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => { setEditingId(opt.id); setEditValue(opt.value); setEditColor(opt.color || '#3b82f6') }} style={{ padding: 6, border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDelete(opt.id)} style={{ padding: 6, border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setEditingUser(null)}>
                    <div style={{ width: 440, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px 0' }}>Edit User Permissions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Name</label><input value={editUserName} onChange={e => setEditUserName(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'white', outline: 'none' }} /></div>
                            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Email</label><input value={editUserEmail} onChange={e => setEditUserEmail(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'white', outline: 'none' }} /></div>
                            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Role</label>
                                <select value={editUserRole} onChange={e => setEditUserRole(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'white', outline: 'none' }}>
                                    <option value="Sales Rep">Sales Rep</option>
                                    <option value="Administrator">Administrator</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Base Salary (৳)</label>
                                <input 
                                    type="number" 
                                    value={editUserSalary} 
                                    onChange={e => setEditUserSalary(parseFloat(e.target.value) || 0)} 
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'white', outline: 'none' }} 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Reset Password</label>
                                <input 
                                    type="password" 
                                    value={editUserPassword} 
                                    onChange={e => setEditUserPassword(e.target.value)} 
                                    placeholder="Leave blank to keep current"
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'white', outline: 'none' }} 
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                <button onClick={() => setEditingUser(null)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleUserUpdate} disabled={processing === editingUser.id} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: 'var(--accent-primary)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
