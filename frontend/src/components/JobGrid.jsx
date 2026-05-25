// frontend/src/components/JobGrid.jsx
import { JobCard } from './JobCard.jsx';
import { filterByQualification } from '../utils/matchScore.js';

function SkeletonCard() {
  return (
    <div className="job-card skeleton-card" aria-hidden="true">
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
        <div className="skel" style={{ width:44, height:44, borderRadius:10 }} />
        <div className="skel" style={{ width:60, height:18, borderRadius:5 }} />
      </div>
      <div className="skel" style={{ width:'72%', height:17, marginBottom:6 }} />
      <div className="skel" style={{ width:'50%', height:13, marginBottom:10 }} />
      <div className="skel" style={{ width:'85%', height:13, marginBottom:6 }} />
      <div style={{ display:'flex', gap:6 }}>
        <div className="skel" style={{ width:70, height:24, borderRadius:6 }} />
        <div className="skel" style={{ width:60, height:24, borderRadius:6 }} />
      </div>
    </div>
  );
}

export function JobGrid({ jobs, status, filter, resume, onDraftOutreach }) {
  if (status === 'loading') {
    return (
      <div className="job-grid">
        {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="empty-state">
        <div className="empty-icon">⚠️</div>
        <h3>Scrapers hit a wall</h3>
        <p>Job portals may be rate-limiting. Try again in a minute.</p>
      </div>
    );
  }

  // Sort by qualification score if resume uploaded — never hide anything
  const scored  = filterByQualification(jobs, resume);
  const filtered = applyFilter(scored, filter);

  if (status === 'success' && filtered.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔍</div>
        <h3>No results for this filter</h3>
        <p>Try "All" or a different portal tab.</p>
      </div>
    );
  }

  // Count how many are strong/good matches for the info bar
  const goodMatches = resume
    ? scored.filter(j => j.matchResult && j.matchResult.score >= 50).length
    : 0;

  return (
    <>
      {resume && scored.length > 0 && (
        <div className="match-info-bar">
          🎯 <strong>{goodMatches}</strong> strong matches for your profile
          · all <strong>{scored.length}</strong> jobs shown, sorted by relevance
        </div>
      )}
      <div className="job-grid">
        {filtered.map((job, i) => (
          <JobCard
            key={`${job.company}-${job.title}-${i}`}
            job={job}
            onDraftOutreach={onDraftOutreach}
          />
        ))}
      </div>
    </>
  );
}

function applyFilter(jobs, filter) {
  switch (filter) {
    case 'priority': return [...jobs].sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0));
    case 'salary':   return jobs.filter(j => j.salary);
    case 'linkedin':
    case 'indeed':
    case 'naukri':   return jobs.filter(j => j.portal === filter);
    default:         return jobs;
  }
}
