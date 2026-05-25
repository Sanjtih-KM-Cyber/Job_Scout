// frontend/src/utils/matchScore.js
// Qualification match scoring — soft scoring only, NO hard filtering.
// Jobs are sorted by score but ALL jobs are shown.
// The score is purely informational — the user decides what's relevant.

const ROLE_GROUPS = [
  ['software engineer','sde','software developer','backend','frontend','full stack','fullstack','developer','programmer'],
  ['product manager','pm','product lead','product owner','program manager'],
  ['data scientist','ml engineer','machine learning','ai engineer','data analyst','analytics'],
  ['devops','sre','site reliability','platform engineer','cloud engineer','infrastructure'],
  ['designer','ux','ui','product designer','interaction designer','visual designer'],
  ['finance manager','finance lead','financial analyst','finance controller','cfo','finance operations','finance director','financial controller','vp finance'],
  ['marketing manager','growth manager','marketing lead','brand manager','digital marketing','marketing director'],
  ['hr manager','human resources','talent acquisition','recruiter','people ops','chro'],
  ['sales manager','account manager','business development','bd manager','sales lead','sales director'],
  ['project manager','delivery manager','scrum master','agile coach','pmo'],
  ['qa engineer','test engineer','sdet','quality assurance','quality engineer'],
  ['security engineer','cybersecurity','infosec','penetration tester','appsec'],
  ['data engineer','etl','analytics engineer','bi developer','data infrastructure','data platform'],
  ['mobile developer','android','ios developer','react native','flutter'],
  ['operations manager','ops manager','operations lead','chief of staff','operations director'],
  ['content writer','copywriter','content strategist','technical writer','editor'],
  ['lawyer','legal counsel','legal manager','company secretary','compliance'],
  ['doctor','physician','surgeon','medical officer','consultant physician'],
  ['accountant','chartered accountant','ca','tax manager','audit manager'],
];

/**
 * Score a job against resume. Returns 0–100 as soft signal only.
 * null = no resume uploaded (show all, no badge).
 */
export function scoreJobMatch(job, resume) {
  if (!resume) return null;

  let score = 0;
  const matchedSkills = [];

  const jobText       = `${job.title} ${job.company}`.toLowerCase();
  const resumeRoleLow = (resume.role || '').toLowerCase();
  const jobTitleLow   = (job.title  || '').toLowerCase();

  // ── 1. Role alignment (up to 60 pts) ─────────────────────────────────
  if (jobTitleLow.includes(resumeRoleLow) || resumeRoleLow.includes(jobTitleLow)) {
    score += 60;
  } else {
    // Check synonym group
    const resumeGroup = ROLE_GROUPS.find(g => g.some(r => resumeRoleLow.includes(r)));
    const jobGroup    = ROLE_GROUPS.find(g => g.some(r => jobTitleLow.includes(r)));

    if (resumeGroup && jobGroup && resumeGroup === jobGroup) {
      score += 50;
    } else {
      // Word overlap — any shared meaningful word is worth 15pts each
      const resumeWords = tokenize(resumeRoleLow);
      const jobWords    = tokenize(jobTitleLow);
      const overlap = resumeWords.filter(w => jobWords.includes(w) && w.length > 3);
      score += Math.min(40, overlap.length * 15);
    }
  }

  // ── 2. Skills match (up to 40 pts) ───────────────────────────────────
  const skills = resume.skills || [];
  if (skills.length > 0) {
    const ptsEach = Math.floor(40 / skills.length);
    for (const skill of skills) {
      if (skill.length < 2) continue;
      if (jobText.includes(skill.toLowerCase())) {
        matchedSkills.push(skill);
        score += ptsEach;
      }
    }
  }

  score = Math.min(100, score);

  return {
    score,
    label:        getLabel(score),
    color:        getColor(score),
    matchedSkills,
  };
}

/**
 * Sort jobs by match score (best first) but NEVER hide any job.
 * Priority-pinned jobs always stay at top regardless of score.
 */
export function filterByQualification(jobs, resume) {
  if (!resume) return jobs;

  return jobs
    .map(job => ({ ...job, matchResult: scoreJobMatch(job, resume) }))
    .sort((a, b) => {
      // Priority pins always first
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      // Then sort by score descending
      return (b.matchResult?.score || 0) - (a.matchResult?.score || 0);
    });
}

function getLabel(score) {
  if (score >= 75) return 'Strong match';
  if (score >= 50) return 'Good match';
  if (score >= 30) return 'Partial match';
  return 'Low match';
}

function getColor(score) {
  if (score >= 75) return '#4fffb0';
  if (score >= 50) return '#00e5ff';
  if (score >= 30) return '#ffd166';
  return '#fb923c';
}

const STOP = new Set([
  'a','an','the','and','or','of','in','at','to','for','with',
  'on','is','are','be','as','by','it','its','sr','jr',
  'senior','junior','lead','head','chief','associate',
]);

function tokenize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w));
}
