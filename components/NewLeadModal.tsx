'use client'
import { useState, useEffect } from 'react'
import { User, Building, X, ChevronDown, ChevronUp, StickyNote } from 'lucide-react'
import ValidatedEmailInput from './ValidatedEmailInput'

const COUNTRY_CODES: Record<string, string> = {
    "Afghanistan": "+93", "Albania": "+355", "Algeria": "+213", "Andorra": "+376", "Angola": "+244", "Antigua and Barbuda": "+1", "Argentina": "+54", "Armenia": "+374", "Australia": "+61", "Austria": "+43", "Azerbaijan": "+994", "Bahamas": "+1", "Bahrain": "+973", "Bangladesh": "+880", "Barbados": "+1", "Belarus": "+375", "Belgium": "+32", "Belize": "+501", "Benin": "+229", "Bhutan": "+975", "Bolivia": "+591", "Bosnia and Herzegovina": "+387", "Botswana": "+267", "Brazil": "+55", "Brunei": "+673", "Bulgaria": "+359", "Burkina Faso": "+226", "Burundi": "+257", "Cabo Verde": "+238", "Cambodia": "+855", "Cameroon": "+237", "Canada": "+1", "Central African Republic": "+236", "Chad": "+235", "Chile": "+56", "China": "+86", "Colombia": "+57", "Comoros": "+269", "Congo": "+242", "Costa Rica": "+506", "Croatia": "+385", "Cuba": "+53", "Cyprus": "+357", "Czechia": "+420", "Denmark": "+45", "Djibouti": "+253", "Dominica": "+1", "Dominican Republic": "+1", "Ecuador": "+593", "Egypt": "+20", "El Salvador": "+503", "Equatorial Guinea": "+240", "Eritrea": "+291", "Estonia": "+372", "Eswatini": "+268", "Ethiopia": "+251", "Fiji": "+679", "Finland": "+358", "France": "+33", "Gabon": "+241", "Gambia": "+220", "Georgia": "+995", "Germany": "+49", "Ghana": "+233", "Greece": "+30", "Grenada": "+1", "Guatemala": "+502", "Guinea": "+224", "Guinea-Bissau": "+245", "Guyana": "+592", "Haiti": "+509", "Honduras": "+504", "Hungary": "+36", "Iceland": "+354", "India": "+91", "Indonesia": "+62", "Iran": "+98", "Iraq": "+964", "Ireland": "+353", "Israel": "+972", "Italy": "+39", "Jamaica": "+1", "Japan": "+81", "Jordan": "+962", "Kazakhstan": "+7", "Kenya": "+254", "Kiribati": "+686", "Kuwait": "+965", "Kyrgyzstan": "+996", "Laos": "+856", "Latvia": "+371", "Lebanon": "+961", "Lesotho": "+266", "Liberia": "+231", "Libya": "+218", "Liechtenstein": "+423", "Lithuania": "+370", "Luxembourg": "+352", "Madagascar": "+261", "Malawi": "+265", "Malaysia": "+60", "Maldives": "+960", "Mali": "+223", "Malta": "+356", "Marshall Islands": "+692", "Mauritania": "+222", "Mauritius": "+230", "Mexico": "+52", "Micronesia": "+691", "Moldova": "+373", "Monaco": "+377", "Mongolia": "+976", "Montenegro": "+382", "Morocco": "+212", "Mozambique": "+258", "Myanmar": "+95", "Namibia": "+264", "Nauru": "+674", "Nepal": "+977", "Netherlands": "+31", "New Zealand": "+64", "Nicaragua": "+505", "Niger": "+227", "Nigeria": "+234", "North Korea": "+850", "North Macedonia": "+389", "Norway": "+47", "Oman": "+968", "Pakistan": "+92", "Palau": "+680", "Palestine": "+970", "Panama": "+507", "Papua New Guinea": "+675", "Paraguay": "+595", "Peru": "+51", "Philippines": "+63", "Poland": "+48", "Portugal": "+351", "Qatar": "+974", "Romania": "+40", "Russia": "+7", "Rwanda": "+250", "Saint Kitts and Nevis": "+1", "Saint Lucia": "+1", "Saint Vincent and the Grenadines": "+1", "Samoa": "+685", "San Marino": "+378", "Sao Tome and Principe": "+239", "Saudi Arabia": "+966", "Senegal": "+221", "Serbia": "+381", "Seychelles": "+248", "Sierra Leone": "+232", "Singapore": "+65", "Slovakia": "+421", "Slovenia": "+386", "Solomon Islands": "+677", "Somalia": "+252", "South Africa": "+27", "South Korea": "+82", "South Sudan": "+211", "Spain": "+34", "Sri Lanka": "+94", "Sudan": "+249", "Suriname": "+597", "Sweden": "+46", "Switzerland": "+41", "Syria": "+963", "Taiwan": "+886", "Tajikistan": "+992", "Tanzania": "+255", "Thailand": "+66", "Timor-Leste": "+670", "Togo": "+228", "Tonga": "+676", "Trinidad and Tobago": "+1", "Tunisia": "+216", "Turkey": "+90", "Turkmenistan": "+993", "Tuvalu": "+688", "Uganda": "+256", "Ukraine": "+380", "United Arab Emirates": "+971", "United Kingdom": "+44", "United States": "+1", "Uruguay": "+598", "Uzbekistan": "+998", "Vanuatu": "+678", "Vatican City": "+379", "Venezuela": "+58", "Vietnam": "+84", "Yemen": "+967", "Zambia": "+260", "Zimbabwe": "+263"
};
const COUNTRIES = Object.keys(COUNTRY_CODES);

// Hardcoded positions removed - now fetched dynamically from SystemOption

// Section header with icon
function SectionHeader({ icon, title, count, action }: { icon: React.ReactNode, title: string, count?: number, action?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                {icon} {title}
                {count !== undefined && count > 0 && (
                    <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>{count}</span>
                )}
            </div>
            {action}
        </div>
    )
}

export default function NewLeadModal({ onSuccess, onClose }: { onSuccess: () => void, onClose: () => void }) {
    const [form, setForm] = useState({ company: '', website: '', country: '', emails: [''], phones: [''], socials: [] as { platform: string, url: string }[], priority: 'Medium', industry: '', notes: '', ownerId: '' })
    const [contacts, setContacts] = useState([{ id: 1, name: '', emails: [''], phones: [''], socials: [] as { platform: string, url: string }[], position: '' }])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [websiteError, setWebsiteError] = useState('')
    const [industryOptions, setIndustryOptions] = useState<{ value: string }[]>([])
    const [positionOptions, setPositionOptions] = useState<{ value: string }[]>([])
    const [showNotes, setShowNotes] = useState(false)
    const [recentCountries, setRecentCountries] = useState<string[]>([])
    const [recentIndustries, setRecentIndustries] = useState<string[]>([])
    const [recentPositions, setRecentPositions] = useState<string[]>([])
    const [showCountryDropdown, setShowCountryDropdown] = useState(false)
    const [showIndustryDropdown, setShowIndustryDropdown] = useState(false)
    const [activePositionIdx, setActivePositionIdx] = useState<number | null>(null)

    const allPhones = [
        ...form.phones,
        ...contacts.flatMap(c => c.phones)
    ].map(p => p.trim()).filter(Boolean);
    const phoneCounts = allPhones.reduce((acc, p) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {} as Record<string, number>);
    const isPhoneDup = (p: string) => p.trim() && phoneCounts[p.trim()] > 1;
    const hasDuplicatePhones = Object.values(phoneCounts).some(count => count > 1);

    const cleanWebsite = (url: string) => {
        const s = url.trim().toLowerCase()
        if (!s) return ''
        const withProto = s.startsWith('http://') || s.startsWith('https://') ? s : 'https://' + s
        try {
            return new URL(withProto).hostname.replace(/^www\./, '')
        } catch {
            return s.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0].split('#')[0]
        }
    }

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetch('/api/admin/settings?category=LEAD_INDUSTRY')
                .then(r => r.json())
                .then(d => { if (d.options) setIndustryOptions(d.options) })
                .catch(console.error)
            fetch('/api/admin/settings?category=LEAD_POSITION')
                .then(r => r.json())
                .then(d => { if (d.options) setPositionOptions(d.options) })
                .catch(console.error)
        }, 300)

        // Load recent countries, industries, and positions
        try {
            const savedCountries = localStorage.getItem('recent_countries')
            if (savedCountries) setRecentCountries(JSON.parse(savedCountries))
            
            const savedIndustries = localStorage.getItem('recent_industries')
            if (savedIndustries) setRecentIndustries(JSON.parse(savedIndustries))
            
            const savedPositions = localStorage.getItem('recent_positions')
            if (savedPositions) setRecentPositions(JSON.parse(savedPositions))
        } catch (e) {
            console.error('Failed to parse recent data from localStorage', e)
        }

        return () => clearTimeout(timeout)
    }, [])

    useEffect(() => {
        if (!form.website) {
            setWebsiteError('')
            return
        }
        const delay = setTimeout(async () => {
            try {
                const res = await fetch(`/api/leads/check-website?website=${encodeURIComponent(form.website)}`)
                if (res.ok) {
                    const data = await res.json()
                    if (data.exists) setWebsiteError('A lead with this website already exists.')
                    else setWebsiteError('')
                }
            } catch (err) {
                console.error(err)
            }
        }, 500)
        return () => clearTimeout(delay)
    }, [form.website])


    function set(field: string, value: string) {
        setForm(f => ({ ...f, [field]: value }))
    }

    async function handleAddPosition(typed: string, idx: number) {
        if (!typed.trim()) return
        const res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: 'LEAD_POSITION', value: typed.trim(), color: '#3b82f6' })
        })
        if (res.ok) {
            const newOpt = await res.json()
            setPositionOptions(prev => [...prev, newOpt])
            const n = [...contacts]; n[idx].position = newOpt.value; setContacts(n)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (websiteError) return
        if (!form.company.trim()) { setError('Company Name is required'); return }
        if (!form.website.trim()) { setError('Website is required'); return }

        let finalCountry = form.country;
        if (form.country) {
            const match = COUNTRIES.find(c => c.toLowerCase() === form.country.trim().toLowerCase());
            if (!match) { setError('Please enter a valid country name.'); return; }
            finalCountry = match;

            // Update recent countries
            const updatedRecent = [finalCountry, ...recentCountries.filter(c => c !== finalCountry)].slice(0, 5)
            localStorage.setItem('recent_countries', JSON.stringify(updatedRecent))
            setRecentCountries(updatedRecent)
        }

        let finalIndustry = form.industry;
        if (form.industry) {
            const match = industryOptions.find(i => i.value.toLowerCase() === form.industry.trim().toLowerCase());
            if (!match) { setError('Please select a valid Industry from the suggestions.'); return; }
            finalIndustry = match.value;

            // Update recent industries
            const updatedRecent = [finalIndustry, ...recentIndustries.filter(i => i !== finalIndustry)].slice(0, 5)
            localStorage.setItem('recent_industries', JSON.stringify(updatedRecent))
            setRecentIndustries(updatedRecent)
        }

        const newRecentPositions = [...recentPositions]
        for (const contact of contacts) {
            if (contact.position) {
                const match = positionOptions.find(o => o.value.toLowerCase() === contact.position.trim().toLowerCase());
                if (!match) { setError('Please select a valid Position/Title from the suggestions.'); return; }
                const matchValue = match.value;
                
                // Track recent positions
                if (!newRecentPositions.includes(matchValue)) {
                    newRecentPositions.unshift(matchValue)
                } else {
                    const idx = newRecentPositions.indexOf(matchValue)
                    newRecentPositions.splice(idx, 1)
                    newRecentPositions.unshift(matchValue)
                }
            }
        }
        const finalRecentPositions = newRecentPositions.slice(0, 5)
        if (finalRecentPositions.length > 0) {
            localStorage.setItem('recent_positions', JSON.stringify(finalRecentPositions))
            setRecentPositions(finalRecentPositions)
        }

        const primary = contacts[0]
        const submitData = {
            ...form,
            country: finalCountry,
            industry: finalIndustry,
            email: form.emails.map(e => e.trim()).filter(Boolean).join(', ') || primary.emails.map(e => e.trim()).filter(Boolean).join(', '),
            phone: form.phones.map(p => p.trim()).filter(Boolean).join(', ') || primary.phones.map(p => p.trim()).filter(Boolean).join(', '),
            socials: JSON.stringify(form.socials.filter(s => s.url.trim() && s.platform.trim())),
            contacts: contacts.filter(c => c.name || c.emails.some(e => e.trim()) || c.phones.some(p => p.trim())).map(c => ({
                id: c.id,
                name: c.name,
                position: c.position ? positionOptions.find(o => o.value.toLowerCase() === c.position.trim().toLowerCase())?.value || c.position : '',
                email: c.emails.map(e => e.trim()).filter(Boolean).join(', '),
                phone: c.phones.map(p => p.trim()).filter(Boolean).join(', '),
                socials: JSON.stringify(c.socials.filter(s => s.url.trim() && s.platform.trim())),
            }))
        }
        setLoading(true); setError('')
        try {
            const res = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submitData),
            })
            if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); return }
            onSuccess()
        } catch { setError('Network error') }
        finally { setLoading(false) }
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div className="card" style={{
                width: '100%', maxWidth: 920, maxHeight: '90vh', overflowY: 'auto',
                padding: 0, position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05)',
                animation: 'slideUp 0.25s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '14px 24px', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10
                }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Create New Lead</h2>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                        color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 8,
                        width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s'
                    }}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444' }}
                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                        <X size={15} />
                    </button>
                </div>

                {error && <div style={{ margin: '10px 20px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 14px', color: '#ef4444', fontSize: 12, fontWeight: 500 }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* 2-Column Layout */}
                    <div style={{ display: 'flex', gap: 0, minHeight: 0 }}>

                        {/* LEFT COLUMN — Company Information */}
                        <div style={{ flex: 1, padding: '16px 20px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <SectionHeader icon={<Building size={15} color="var(--accent-primary)" />} title="Company Information" />

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Company Name *</label>
                                <input placeholder="e.g. Acme Corp" value={form.company} onChange={e => set('company', e.target.value)} required />
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                    <label className="form-label">Website *</label>
                                    <input type="text" placeholder="acme.com" value={form.website} onChange={e => set('website', cleanWebsite(e.target.value))} style={{ borderColor: websiteError ? '#ef4444' : undefined }} required />
                                    {websiteError && <div style={{ color: '#ef4444', fontSize: 10, marginTop: 3 }}>{websiteError}</div>}
                                </div>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                    <label className="form-label">Country</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, color: 'var(--text-muted)', background: 'transparent', borderColor: 'transparent', zIndex: 1, pointerEvents: 'none' }}
                                            value={form.country ? (COUNTRIES.find(c => c.toLowerCase().startsWith(form.country.toLowerCase())) ? form.country + COUNTRIES.find(c => c.toLowerCase().startsWith(form.country.toLowerCase()))!.slice(form.country.length) : '') : ''}
                                            readOnly tabIndex={-1}
                                        />
                                        <input
                                            style={{ position: 'relative', zIndex: 2, background: 'transparent' }}
                                            placeholder="e.g. United States"
                                            value={form.country}
                                            onFocus={() => setShowCountryDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
                                            onChange={e => set('country', e.target.value)}
                                            onKeyDown={e => {
                                                if ((e.key === 'Tab' || e.key === 'ArrowRight') && form.country) {
                                                    const match = COUNTRIES.find(c => c.toLowerCase().startsWith(form.country.toLowerCase()))
                                                    if (match && match !== form.country) {
                                                        if (e.key === 'ArrowRight') e.preventDefault()
                                                        set('country', form.country + match.slice(form.country.length))
                                                    }
                                                }
                                                if (e.key === 'Escape') setShowCountryDropdown(false)
                                            }}
                                        />
                                        {showCountryDropdown && recentCountries.length > 0 && (
                                            <div style={{
                                                position: 'absolute', top: '100%', left: 0, right: 0,
                                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                                borderRadius: 8, marginTop: 4, zIndex: 100,
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                                                overflow: 'hidden', animation: 'fadeIn 0.15s ease-out'
                                            }}>
                                                <div style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>RECENT COUNTRIES</div>
                                                {recentCountries.map(c => (
                                                    <div
                                                        key={c}
                                                        onClick={() => {
                                                            set('country', c)
                                                            setShowCountryDropdown(false)
                                                        }}
                                                        style={{
                                                            padding: '8px 12px', fontSize: 12, cursor: 'pointer',
                                                            transition: 'background 0.15s', borderBottom: '1px solid rgba(255,255,255,0.03)'
                                                        }}
                                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        {c}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <label className="form-label" style={{ marginBottom: 0 }}>Email</label>
                                        <button type="button" onClick={() => setForm(f => ({ ...f, emails: [...f.emails, ''] }))} style={{ color: 'var(--accent-primary)', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+</button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        {form.emails.map((email, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                <ValidatedEmailInput
                                                    placeholder="info@acme.com"
                                                    value={email}
                                                    onChange={val => {
                                                        const n = [...form.emails]; n[idx] = val; setForm(f => ({ ...f, emails: n }))
                                                    }}
                                                />
                                                {form.emails.length > 1 && (
                                                    <button type="button" onClick={() => setForm(f => ({ ...f, emails: f.emails.filter((_, i) => i !== idx) }))} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><X size={12} /></button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <label className="form-label" style={{ marginBottom: 0 }}>Phone</label>
                                        <button type="button" onClick={() => setForm(f => ({ ...f, phones: [...f.phones, ''] }))} style={{ color: 'var(--accent-primary)', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+</button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        {form.phones.map((phone, idx) => (
                                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                    <input type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={e => {
                                                        const n = [...form.phones]; n[idx] = e.target.value; setForm(f => ({ ...f, phones: n }))
                                                    }} style={{ flex: 1, borderColor: isPhoneDup(phone) ? '#ef4444' : undefined }} />
                                                    {form.phones.length > 1 && (
                                                        <button type="button" onClick={() => setForm(f => ({ ...f, phones: f.phones.filter((_, i) => i !== idx) }))} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><X size={12} /></button>
                                                    )}
                                                </div>
                                                {isPhoneDup(phone) && <div style={{ color: '#ef4444', fontSize: 10, marginLeft: 2 }}>Duplicate number</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                    <label className="form-label">Priority</label>
                                    <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                                        {['High', 'Medium', 'Low'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                    <label className="form-label">Industry</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, color: 'var(--text-muted)', background: 'transparent', borderColor: 'transparent', zIndex: 1, pointerEvents: 'none' }}
                                            value={form.industry ? (industryOptions.find(i => i.value.toLowerCase().startsWith(form.industry.toLowerCase())) ? form.industry + industryOptions.find(i => i.value.toLowerCase().startsWith(form.industry.toLowerCase()))!.value.slice(form.industry.length) : '') : ''}
                                            readOnly tabIndex={-1}
                                        />
                                        <input
                                            style={{ position: 'relative', zIndex: 2, background: 'transparent' }}
                                            placeholder="Start typing..."
                                            value={form.industry}
                                            onFocus={() => setShowIndustryDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowIndustryDropdown(false), 200)}
                                            onChange={e => set('industry', e.target.value)}
                                            onKeyDown={e => {
                                                if ((e.key === 'Tab' || e.key === 'ArrowRight') && form.industry) {
                                                    const match = industryOptions.find(i => i.value.toLowerCase().startsWith(form.industry.toLowerCase()))
                                                    if (match && match.value !== form.industry) {
                                                        if (e.key === 'ArrowRight') e.preventDefault()
                                                        set('industry', form.industry + match.value.slice(form.industry.length))
                                                    }
                                                }
                                                if (e.key === 'Escape') setShowIndustryDropdown(false)
                                            }}
                                        />
                                        {showIndustryDropdown && recentIndustries.length > 0 && (
                                            <div style={{
                                                position: 'absolute', top: '100%', left: 0, right: 0,
                                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                                borderRadius: 8, marginTop: 4, zIndex: 100,
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                                                overflow: 'hidden', animation: 'fadeIn 0.15s ease-out'
                                            }}>
                                                <div style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>RECENT INDUSTRIES</div>
                                                {recentIndustries.map(i => (
                                                    <div
                                                        key={i}
                                                        onClick={() => {
                                                            set('industry', i)
                                                            setShowIndustryDropdown(false)
                                                        }}
                                                        style={{
                                                            padding: '8px 12px', fontSize: 12, cursor: 'pointer',
                                                            transition: 'background 0.15s', borderBottom: '1px solid rgba(255,255,255,0.03)'
                                                        }}
                                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        {i}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Company Social Media */}
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <label className="form-label" style={{ marginBottom: 0, fontSize: 10 }}>Social Media</label>
                                    <button type="button" onClick={() => setForm(f => ({ ...f, socials: [...f.socials, { platform: 'LinkedIn', url: '' }] }))} style={{ color: 'var(--accent-primary)', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+ Add</button>
                                </div>
                                {form.socials.length === 0 && (
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.5 }}>No social links added</div>
                                )}
                                {form.socials.map((social, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                        <select value={social.platform} onChange={e => {
                                            const n = [...form.socials]; n[idx].platform = e.target.value; setForm(f => ({ ...f, socials: n }))
                                        }} style={{ width: 110, flexShrink: 0 }}>
                                            {['LinkedIn', 'Twitter', 'Facebook', 'Instagram', 'GitHub', 'Other'].map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                        <input type="url" placeholder="https://..." value={social.url} onChange={e => {
                                            const n = [...form.socials]; n[idx].url = e.target.value; setForm(f => ({ ...f, socials: n }))
                                        }} style={{ flex: 1 }} />
                                        <button type="button" onClick={() => setForm(f => ({ ...f, socials: f.socials.filter((_, i) => i !== idx) }))} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><X size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT COLUMN — Contact & Notes */}
                        <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <SectionHeader
                                icon={<User size={15} color="#10b981" />}
                                title="Contact Persons"
                                count={contacts.length}
                                action={
                                    <button type="button" onClick={() => setContacts([...contacts, { id: Date.now(), name: '', emails: [''], phones: [''], socials: [], position: '' }])} style={{
                                        color: '#10b981', fontSize: 10, background: 'rgba(16,185,129,0.08)',
                                        border: '1px solid rgba(16,185,129,0.15)', cursor: 'pointer',
                                        fontWeight: 700, padding: '3px 8px', borderRadius: 6
                                    }}>+ Add</button>
                                }
                            />

                            {contacts.map((contact, i) => (
                                <div key={contact.id} style={{
                                    display: 'flex', flexDirection: 'column', gap: 8,
                                    marginBottom: i < contacts.length - 1 ? 12 : 0,
                                    paddingBottom: i < contacts.length - 1 ? 12 : 0,
                                    borderBottom: i < contacts.length - 1 ? '1px dashed rgba(255,255,255,0.06)' : 'none'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, fontWeight: 700, color: i === 0 ? '#10b981' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {i === 0 ? '★ Primary Contact' : `Contact ${i + 1}`}
                                        {i > 0 && <button type="button" onClick={() => setContacts(contacts.filter(c => c.id !== contact.id))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'none', letterSpacing: 'normal', fontSize: 10 }}>Remove</button>}
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                            <label className="form-label">Full Name</label>
                                            <input placeholder="e.g. Sarah Jenkins" value={contact.name} onChange={e => {
                                                const n = [...contacts]; n[i].name = e.target.value; setContacts(n)
                                            }} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                            <label className="form-label">Position</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, color: 'var(--text-muted)', background: 'transparent', borderColor: 'transparent', zIndex: 1, pointerEvents: 'none' }}
                                                    value={contact.position ? (positionOptions.find(o => o.value.toLowerCase().startsWith(contact.position.toLowerCase())) ? contact.position + positionOptions.find(o => o.value.toLowerCase().startsWith(contact.position.toLowerCase()))!.value.slice(contact.position.length) : '') : ''}
                                                    readOnly tabIndex={-1}
                                                />
                                                <input
                                                    style={{ position: 'relative', zIndex: 2, background: 'transparent' }}
                                                    placeholder="e.g. Senior Retoucher"
                                                    value={contact.position}
                                                    onFocus={() => setActivePositionIdx(i)}
                                                    onBlur={() => setTimeout(() => setActivePositionIdx(null), 200)}
                                                    onChange={e => {
                                                        const n = [...contacts]; n[i].position = e.target.value; setContacts(n)
                                                    }}
                                                    onKeyDown={e => {
                                                        if ((e.key === 'Tab' || e.key === 'ArrowRight') && contact.position) {
                                                            const match = positionOptions.find(o => o.value.toLowerCase().startsWith(contact.position.toLowerCase()))
                                                            if (match && match.value !== contact.position) {
                                                                if (e.key === 'ArrowRight') e.preventDefault()
                                                                const n = [...contacts]; n[i].position = contact.position + match.value.slice(contact.position.length); setContacts(n)
                                                            }
                                                        }
                                                        if (e.key === 'Escape') setActivePositionIdx(null)
                                                    }}
                                                />
                                                {activePositionIdx === i && (
                                                    <div style={{
                                                        position: 'absolute', top: '100%', left: 0, right: 0,
                                                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                                                        borderRadius: 8, marginTop: 4, zIndex: 100,
                                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                                                        overflow: 'hidden', animation: 'fadeIn 0.15s ease-out'
                                                    }}>
                                                        {contact.position && !positionOptions.some(o => o.value.toLowerCase() === contact.position.toLowerCase()) && (
                                                            <div
                                                                onClick={() => {
                                                                    handleAddPosition(contact.position, i)
                                                                    setActivePositionIdx(null)
                                                                }}
                                                                style={{
                                                                    padding: '10px 12px', fontSize: 12, cursor: 'pointer',
                                                                    color: 'var(--accent-primary)', fontWeight: 700,
                                                                    background: 'rgba(99,102,241,0.05)',
                                                                    borderBottom: recentPositions.length > 0 ? '1px solid var(--border)' : 'none'
                                                                }}
                                                                onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                                                                onMouseOut={e => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'}
                                                            >
                                                                + Add "{contact.position}" as new official position
                                                            </div>
                                                        )}
                                                        {recentPositions.length > 0 && (
                                                            <>
                                                                <div style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>RECENT POSITIONS</div>
                                                                {recentPositions.map(p => (
                                                                    <div
                                                                        key={p}
                                                                        onClick={() => {
                                                                            const n = [...contacts]; n[i].position = p; setContacts(n); setActivePositionIdx(null)
                                                                        }}
                                                                        style={{
                                                                            padding: '8px 12px', fontSize: 12, cursor: 'pointer',
                                                                            transition: 'background 0.15s', borderBottom: '1px solid rgba(255,255,255,0.03)'
                                                                        }}
                                                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                                                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                                                    >
                                                                        {p}
                                                                    </div>
                                                                ))}
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <label className="form-label" style={{ marginBottom: 0 }}>Email</label>
                                                <button type="button" onClick={() => { const n = [...contacts]; n[i].emails.push(''); setContacts(n) }} style={{ color: 'var(--accent-primary)', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+</button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {contact.emails.map((email, eIdx) => (
                                                    <div key={eIdx} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                        <ValidatedEmailInput
                                                            placeholder="contact@acme.com"
                                                            value={email}
                                                            onChange={val => {
                                                                const n = [...contacts]; n[i].emails[eIdx] = val; setContacts(n)
                                                            }}
                                                        />
                                                        {contact.emails.length > 1 && (
                                                            <button type="button" onClick={() => { const n = [...contacts]; n[i].emails = n[i].emails.filter((_, idx) => idx !== eIdx); setContacts(n) }} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><X size={12} /></button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <label className="form-label" style={{ marginBottom: 0 }}>Phone</label>
                                                <button type="button" onClick={() => { const n = [...contacts]; n[i].phones.push(''); setContacts(n) }} style={{ color: 'var(--accent-primary)', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+</button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {contact.phones.map((phone, pIdx) => (
                                                    <div key={pIdx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                            <input type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={e => {
                                                                const n = [...contacts]; n[i].phones[pIdx] = e.target.value; setContacts(n)
                                                            }} style={{ flex: 1, borderColor: isPhoneDup(phone) ? '#ef4444' : undefined }} />
                                                            {contact.phones.length > 1 && (
                                                                <button type="button" onClick={() => { const n = [...contacts]; n[i].phones = n[i].phones.filter((_, idx) => idx !== pIdx); setContacts(n) }} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><X size={12} /></button>
                                                            )}
                                                        </div>
                                                        {isPhoneDup(phone) && <div style={{ color: '#ef4444', fontSize: 10, marginLeft: 2 }}>Duplicate number</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Social */}
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <label className="form-label" style={{ marginBottom: 0, fontSize: 10 }}>Social Media</label>
                                            <button type="button" onClick={() => { const n = [...contacts]; n[i].socials.push({ platform: 'LinkedIn', url: '' }); setContacts(n) }} style={{ color: 'var(--accent-primary)', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+ Add</button>
                                        </div>
                                        {contact.socials && contact.socials.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {contact.socials.map((social, sIdx) => (
                                                    <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <select value={social.platform} onChange={e => {
                                                            const n = [...contacts]; n[i].socials[sIdx].platform = e.target.value; setContacts(n)
                                                        }} style={{ width: 100, flexShrink: 0 }}>
                                                            {['LinkedIn', 'Twitter', 'Facebook', 'Instagram', 'GitHub', 'Other'].map(p => <option key={p} value={p}>{p}</option>)}
                                                        </select>
                                                        <input type="url" placeholder="https://..." value={social.url} onChange={e => {
                                                            const n = [...contacts]; n[i].socials[sIdx].url = e.target.value; setContacts(n)
                                                        }} style={{ flex: 1 }} />
                                                        <button type="button" onClick={() => {
                                                            const n = [...contacts]; n[i].socials = n[i].socials.filter((_, idx) => idx !== sIdx); setContacts(n)
                                                        }} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><X size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Collapsible Notes - at bottom of right column */}
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 'auto' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowNotes(!showNotes)}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '8px 12px', borderRadius: 8,
                                        background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(255,255,255,0.04)',
                                        cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.15s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12 }}>
                                        <StickyNote size={13} color="#f59e0b" /> Initial Note
                                        {form.notes && <span style={{ fontSize: 9, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '1px 5px', borderRadius: 3 }}>✓</span>}
                                    </div>
                                    {showNotes ? <ChevronUp size={13} color="var(--text-muted)" /> : <ChevronDown size={13} color="var(--text-muted)" />}
                                </button>
                                {showNotes && (
                                    <div style={{ paddingTop: 8 }}>
                                        <textarea
                                            rows={3}
                                            placeholder="Write any initial thoughts or meeting notes..."
                                            value={form.notes}
                                            onChange={e => set('notes', e.target.value)}
                                            style={{ resize: 'vertical', minHeight: 70, fontSize: 12 }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '12px 24px', background: 'var(--bg-input)',
                        display: 'flex', justifyContent: 'flex-end', gap: 10,
                        position: 'sticky', bottom: 0, zIndex: 10,
                        borderTop: '1px solid var(--border)'
                    }}>
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading || hasDuplicatePhones} style={{ minWidth: 130, opacity: (loading || hasDuplicatePhones) ? 0.7 : 1, cursor: hasDuplicatePhones ? 'not-allowed' : 'pointer' }}>
                            {loading ? <div className="spinner" /> : 'Create Lead ✓'}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    )
}
