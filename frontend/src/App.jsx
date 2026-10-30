import { useEffect, useMemo, useState } from 'react'

const STATUSES = ['Open', 'In Progress', 'Resolved']
const PRIORITIES = ['High', 'Medium', 'Low']

function ChoiceButtons({ label, options, value, onChange }) {
  return <fieldset><legend>{label}</legend><div className="choice-group">
    {options.map((option) => <button className={value === option ? 'choice selected' : 'choice'} key={option}
      type="button" aria-pressed={value === option} onClick={() => onChange(option)}>{option}</button>)}
  </div></fieldset>
}

function App() {
  const [issues, setIssues] = useState([])
  const [filter, setFilter] = useState('All')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState(null)
  const [priority, setPriority] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    fetch('/api/issues').then((response) => {
      if (!response.ok) throw new Error('Unable to load issues.')
      return response.json()
    }).then((data) => { if (!ignore) setIssues(data) })
      .catch((requestError) => { if (!ignore) setError(requestError.message) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])

  const visibleIssues = useMemo(
    () => filter === 'All' ? issues : issues.filter((issue) => issue.status === filter),
    [filter, issues],
  )

  async function handleSubmit(event) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return setError('Enter a title that is not only whitespace.')
    if (!priority || !status) return setError('Select both a priority and a status.')

    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: cleanTitle, description: description.trim(), priority, status }),
      })
      if (!response.ok) {
        const responseBody = await response.json().catch(() => null)
        const message = response.status === 409 && responseBody?.detail
          ? responseBody.detail
          : 'Unable to create the issue. Check the form and try again.'
        throw new Error(message)
      }
      const createdIssue = await response.json()
      setIssues((currentIssues) => [...currentIssues, createdIssue])
      setTitle('')
      setDescription('')
      setStatus(null)
      setPriority(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <main>
    <header><p className="eyebrow">Issue tracker</p><h1>Keep work moving.</h1>
      <p className="subtitle">Create, prioritize, and follow issues through resolution.</p></header>
    <div className="layout">
      <section className="panel" aria-labelledby="create-heading">
        <h2 id="create-heading">Create an issue</h2>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="title">Title *</label>
          <input id="title" value={title} onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs attention?" maxLength={200} required />
          <label htmlFor="description">Description <span className="optional">Optional</span></label>
          <textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)}
            placeholder="Add useful context" rows="5" />
          <ChoiceButtons label="Priority *" options={PRIORITIES} value={priority} onChange={setPriority} />
          <ChoiceButtons label="Status *" options={STATUSES} value={status} onChange={setStatus} />
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="submit-button" type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create issue'}</button>
        </form>
      </section>

      <section className="panel" aria-labelledby="issues-heading">
        <div className="issues-heading"><div><p className="eyebrow">Workspace</p><h2 id="issues-heading">Issues</h2></div>
          <span className="count">{visibleIssues.length}</span></div>
        <nav className="filters" aria-label="Filter issues by status">
          {['All', ...STATUSES].map((option) => <button key={option} className={filter === option ? 'filter active' : 'filter'}
            type="button" aria-pressed={filter === option} onClick={() => setFilter(option)}>{option}</button>)}
        </nav>
        {loading ? <p className="empty-state">Loading issues…</p> : visibleIssues.length === 0 ?
          <p className="empty-state">No {filter === 'All' ? '' : `${filter.toLowerCase()} `}issues yet.</p> :
          <ul className="issue-list">{visibleIssues.map((issue) => <li className="issue-card" key={issue.id}>
            <div className="issue-topline"><span className={`priority priority-${issue.priority.toLowerCase()}`}>{issue.priority}</span>
              <span className="issue-id">#{issue.id}</span></div>
            <h3>{issue.title}</h3>{issue.description && <p>{issue.description}</p>}
            <span className={`status status-${issue.status.toLowerCase().replace(' ', '-')}`}>{issue.status}</span>
          </li>)}</ul>}
      </section>
    </div>
  </main>
}

export default App
