// frontend/src/utils/matchScore.js
// Qualification match — only active when resume is uploaded.
// Scores based on role alignment + skill keywords in job title/description.
// Shows badge only when resume exists. No hard filtering — all jobs shown.

const ROLE_GROUPS = [
  ['software engineer','sde','software developer','backend','frontend','full stack','fullstack','developer','programmer','coder'],
  ['product manager','pm','product lead','product owner','program manager','product analyst'],
  ['data scientist','ml engineer','machine learning','ai engineer','data analyst','analytics','data science'],
  ['devops','sre','site reliability','platform engineer','cloud engineer','infrastructure','devsecops'],
  ['designer','ux','ui','product designer','interaction designer','visual designer','graphic designer'],
  ['finance manager','finance lead','financial analyst','finance controller','cfo','finance operations','finance director','financial controller','vp finance','treasury','fp&a'],
  ['marketing manager','growth manager','marketing lead','brand manager','digital marketing','marketing director','performance marketing','seo','sem'],
  ['hr manager','human resources','talent acquisition','recruiter','people ops','chro','hrbp','hr business partner'],
  ['sales manager','account manager','business development','bd manager','sales lead','sales director','account executive','revenue'],
  ['project manager','delivery manager','scrum master','agile coach','pmo','program manager'],
  ['qa engineer','test engineer','sdet','quality assurance','quality engineer','automation engineer'],
  ['security engineer','cybersecurity','infosec','penetration tester','appsec','soc analyst'],
  ['data engineer','etl','analytics engineer','bi developer','data infrastructure','data platform','data architect'],
  ['mobile developer','android','ios developer','react native','flutter','mobile engineer'],
  ['operations manager','ops manager','operations lead','chief of staff','operations director','supply chain','logistics'],
  ['content writer','copywriter','content strategist','technical writer','editor','content creator'],
  ['lawyer','legal counsel','legal manager','company secretary','compliance','legal advisor'],
  ['accountant','chartered accountant','ca','tax manager','audit manager','cpa','controller'],
  ['consultant','strategy','management consultant','business analyst','advisory'],
  ['customer success','customer support','csm','client success','account management'],
];

export function scoreJobMatch(job, resume) {
  // Only score when resume has been uploaded and parsed
  if (!resume || !resume.role) return null;

  const resumeRoleLow = resume.role.toLowerCase();
  const jobTitleLow   = (job.title || '').toLowerCase();
  const jobText       = `${job.title} ${job.company}`.toLowerCase();
  const skills        = resume.skills || [];

  let score = 0;

  // ── 1. Role alignment (0–60 pts) ─────────────────────────────────────
  if (jobTitleLow === resumeRoleLow) {
    // Exact match
    score += 60;
  } else if (jobTitleLow.includes(resumeRoleLow) || resumeRoleLow.includes(jobTitleLow)) {
    // One contains the other
    score += 50;
  } else {
    // Check role synonym group
    const resumeGroup = ROLE_GROUPS.find(g => g.some(r => resumeRoleLow.includes(r)));
    const jobGroup    = ROLE_GROUPS.find(g => g.some(r => jobTitleLow.includes(r)));

    if (resumeGroup && jobGroup) {
      if (resumeGroup === jobGroup) {
        score += 40; // Same domain group
      } else {
        score += 0;  // Different domain — penalise by adding nothing
      }
    } else {
      // Word overlap — each shared meaningful word = 12 pts
      const resumeWords = tokenize(resumeRoleLow);
      const jobWords    = tokenize(jobTitleLow);
      const overlap = resumeWords.filter(w => jobWords.includes(w) && w.length > 3);
      score += Math.min(35, overlap.length * 12);
    }
  }

  // ── 2. Skills match (0–40 pts) ────────────────────────────────────────
  // Only count if we actually have skills extracted
  const matchedSkills = [];
  if (skills.length > 0) {
    const ptsEach = Math.round(40 / Math.min(skills.length, 8));
    for (const skill of skills.slice(0, 8)) {
      const skillLow = (skill || '').toLowerCase().trim();
      if (skillLow.length < 2) continue;
      if (jobText.includes(skillLow)) {
        matchedSkills.push(skill);
        score += ptsEach;
      }
    }
  }

  // ── 3. Domain mismatch penalty ────────────────────────────────────────
  // If resume is finance and job is software (or vice versa), heavily penalise
  const resumeGroup = ROLE_GROUPS.find(g => g.some(r => resumeRoleLow.includes(r)));
  const jobGroup    = ROLE_GROUPS.find(g => g.some(r => jobTitleLow.includes(r)));
  if (resumeGroup && jobGroup && resumeGroup !== jobGroup) {
    score = Math.min(score, 25); // Cap at 25 for cross-domain jobs
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    label:        getLabel(score),
    color:        getColor(score),
    matchedSkills,
  };
}

export function filterByQualification(jobs, resume) {
  // No resume = no scoring, return as-is
  if (!resume || !resume.role) return jobs;

  return jobs
    .map(job => ({ ...job, matchResult: scoreJobMatch(job, resume) }))
    .sort((a, b) => {
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
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
  return (str || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w));
}
