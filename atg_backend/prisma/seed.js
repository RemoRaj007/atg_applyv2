/**
 * ATG Apply — Seed Script
 *
 * Seeds a realistic dataset: 1 admin, 5 operators, 10 candidates (each with a
 * full profile), 20 jobs (with skills), and the scholarships from
 * data/scholarships.csv alongside two curated ones, plus supporting
 * companies/job roles/skills and a batch of candidate applications.
 *
 * Safe by default: if the database already has users, seeding is skipped so
 * this can run automatically on every fresh setup without wiping real data.
 * Pass --force to wipe and reseed anyway.
 *
 * Usage:
 *   node prisma/seed.js            (skips if data already exists)
 *   node prisma/seed.js --force    (wipes all tables, then reseeds)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const argon2 = require('argon2');
const { prisma } = require('../config/db');
const { toRecords } = require('../scripts/importScholarships');
const { seedProfileSchema } = require('../scripts/seedProfileSchema');

const FORCE = process.argv.includes('--force');
const SEED_PASSWORD = 'Password123!';

const c = {
  reset: '\x1b[0m', green: '\x1b[32m', cyan: '\x1b[36m',
  red: '\x1b[31m', yellow: '\x1b[33m', bold: '\x1b[1m',
};
const log = (msg) => console.log(`${c.cyan}▸${c.reset} ${msg}`);
const done = (msg) => console.log(`${c.green}✔${c.reset} ${msg}`);
const warn = (msg) => console.log(`${c.yellow}⚠${c.reset} ${msg}`);
const head = (msg) => console.log(`\n${c.bold}${c.cyan}━━ ${msg} ━━${c.reset}`);

async function wipeAll() {
  head('WIPING ALL TABLES (--force)');
  const order = [
    'jobFormValue', 'jobFormColumn', 'jobSkill', 'jobRoleSkill', 'userJobRole',
    'applicationComment', 'candidateApplication', 'profileValue', 'userSkill',
    'userReference', 'userExperience', 'userOtherQualification', 'userDocument',
    'userItSkill', 'userLanguage', 'userAcademicQualification', 'userAddress',
    'userPhone', 'userProfile', 'payment', 'notification', 'scholarship',
    'logEntry', 'changeRequest', 'profileColumn', 'profileSection',
    'job', 'jobRole', 'skill',
    'user', 'company',
  ];
  for (const model of order) {
    try {
      const result = await prisma[model].deleteMany();
      log(`Cleared ${c.yellow}${model}${c.reset} (${result.count} rows)`);
    } catch (e) {
      warn(`Skipped ${model}: ${e.message.split('\n')[0]}`);
    }
  }
  done('All tables wiped.\n');
}

// ─── Reference data ────────────────────────────────────────────────
const JOB_ROLES = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'DevOps Engineer', 'Data Scientist', 'UI/UX Designer', 'QA Engineer',
  'Mobile Developer (React Native)', 'Cloud Architect', 'Cybersecurity Analyst',
  'Site Reliability Engineer (SRE)', 'Business Analyst',
];

const SKILLS = [
  { name: 'React', category: 'technical' }, { name: 'TypeScript', category: 'technical' },
  { name: 'JavaScript', category: 'technical' }, { name: 'Next.js', category: 'technical' },
  { name: 'Tailwind CSS', category: 'technical' }, { name: 'Node.js', category: 'technical' },
  { name: 'Express.js', category: 'technical' }, { name: 'MySQL', category: 'technical' },
  { name: 'PostgreSQL', category: 'technical' }, { name: 'Docker', category: 'technical' },
  { name: 'Kubernetes', category: 'technical' }, { name: 'AWS', category: 'technical' },
  { name: 'CI/CD', category: 'technical' }, { name: 'Terraform', category: 'technical' },
  { name: 'Python', category: 'technical' }, { name: 'Pandas', category: 'technical' },
  { name: 'SQL', category: 'technical' }, { name: 'Figma', category: 'design' },
  { name: 'Adobe XD', category: 'design' }, { name: 'Selenium', category: 'technical' },
  { name: 'Cypress', category: 'technical' }, { name: 'Git', category: 'technical' },
  { name: 'REST APIs', category: 'technical' }, { name: 'React Native', category: 'technical' },
  { name: 'Azure', category: 'technical' }, { name: 'GCP', category: 'technical' },
  { name: 'Linux/Bash', category: 'technical' }, { name: 'Nginx', category: 'technical' },
  { name: 'Communication', category: 'soft' }, { name: 'Agile/Scrum', category: 'soft' },
  { name: 'Jira', category: 'soft' },
];

// Fictional employers. These are fabricated listings, so naming real companies
// would attribute invented roles, salaries and requirements to businesses that
// never posted them. Locations are real cities — only the employers are made up.
const JOBS = [
  { company: 'Northwind Cloud', title: 'Frontend Engineer', location: 'Remote', experience: '2+', locationType: 'Full-time', jobRoleName: 'Frontend Developer', skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'] },
  { company: 'Meridian Payments', title: 'Backend Engineer (Node.js)', location: 'Remote / San Francisco, USA', experience: '3+', locationType: 'Full-time', jobRoleName: 'Backend Developer', skills: ['Node.js', 'Express.js', 'PostgreSQL', 'Docker'] },
  { company: 'Lumen Commerce', title: 'Full Stack Developer', location: 'Remote', experience: '3-5', locationType: 'Full-time', jobRoleName: 'Full Stack Developer', skills: ['React', 'Node.js', 'TypeScript', 'MySQL'] },
  { company: 'Nordvik Pay', title: 'Senior Backend Engineer', location: 'Stockholm, Sweden', experience: '5+', locationType: 'Full-time', jobRoleName: 'Backend Developer', skills: ['Node.js', 'Kubernetes', 'Docker', 'PostgreSQL'] },
  { company: 'Quillspace', title: 'Product Designer', location: 'Remote', experience: '2+', locationType: 'Full-time', jobRoleName: 'UI/UX Designer', skills: ['Figma', 'Adobe XD', 'Communication'] },
  { company: 'Wanderly', title: 'Data Scientist', location: 'Remote / New York, USA', experience: '3+', locationType: 'Full-time', jobRoleName: 'Data Scientist', skills: ['Python', 'Pandas', 'SQL'] },
  { company: 'Vantage Labs', title: 'Machine Learning Engineer', location: 'Menlo Park, USA', experience: '4+', locationType: 'Full-time', jobRoleName: 'Data Scientist', skills: ['Python', 'Pandas', 'Docker'] },
  { company: 'Waveform Audio', title: 'DevOps Engineer', location: 'Remote / Stockholm, Sweden', experience: '3+', locationType: 'Full-time', jobRoleName: 'DevOps Engineer', skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform'] },
  { company: 'Velo Mobility', title: 'Mobile Developer (React Native)', location: 'Singapore', experience: '2-4', locationType: 'Full-time', jobRoleName: 'Mobile Developer (React Native)', skills: ['React Native', 'JavaScript', 'TypeScript'] },
  { company: 'Kestrel Systems', title: 'Cloud Architect', location: 'Frankfurt, Germany', experience: '5+', locationType: 'Full-time', jobRoleName: 'Cloud Architect', skills: ['AWS', 'Azure', 'GCP', 'Kubernetes', 'Terraform'] },
  { company: 'Serendib Systems', title: 'Senior Full Stack Developer', location: 'Colombo, Sri Lanka', experience: '4+', locationType: 'Full-time', jobRoleName: 'Full Stack Developer', skills: ['React', 'Node.js', 'MySQL', 'Git'] },
  { company: 'Ceylon Enterprise Software', title: 'Backend Developer', location: 'Colombo, Sri Lanka', experience: '2-5', locationType: 'Full-time', jobRoleName: 'Backend Developer', skills: ['PostgreSQL', 'REST APIs', 'Git'] },
  { company: 'Lanka Interactive', title: 'Mobile Developer', location: 'Colombo, Sri Lanka', experience: '2+', locationType: 'Full-time', jobRoleName: 'Mobile Developer (React Native)', skills: ['React Native', 'REST APIs', 'Git'] },
  { company: 'Indigo Labs', title: 'QA Automation Engineer', location: 'Colombo, Sri Lanka', experience: '2+', locationType: 'Full-time', jobRoleName: 'QA Engineer', skills: ['Selenium', 'Cypress', 'Python'] },
  { company: 'Cinnamon Digital', title: 'Business Analyst', location: 'Colombo, Sri Lanka', experience: '3+', locationType: 'Full-time', jobRoleName: 'Business Analyst', skills: ['SQL', 'Jira', 'Communication', 'Agile/Scrum'] },
  { company: 'Palette Studio', title: 'Product Designer', location: 'Remote / Sydney, Australia', experience: '2+', locationType: 'Full-time', jobRoleName: 'UI/UX Designer', skills: ['Figma', 'Communication'] },
  { company: 'Summit Toolworks', title: 'QA Engineer', location: 'Sydney, Australia', experience: '2-4', locationType: 'Full-time', jobRoleName: 'QA Engineer', skills: ['Cypress', 'Selenium', 'Jira'] },
  { company: 'Voyagr', title: 'Site Reliability Engineer', location: 'Remote / Amsterdam, Netherlands', experience: '4+', locationType: 'Full-time', jobRoleName: 'Site Reliability Engineer (SRE)', skills: ['Linux/Bash', 'Docker', 'Kubernetes', 'Nginx', 'CI/CD'] },
  { company: 'Orbital Suite', title: 'Backend Developer', location: 'Chennai, India', experience: '2-5', locationType: 'Full-time', jobRoleName: 'Backend Developer', skills: ['Node.js', 'MySQL', 'REST APIs'] },
  { company: 'Beacon Metrics', title: 'Cybersecurity Analyst', location: 'Remote / London, UK', experience: '3+', locationType: 'Full-time', jobRoleName: 'Cybersecurity Analyst', skills: ['Linux/Bash', 'Python', 'AWS'] },
];

// Two curated ATG scholarships, plus every scholarship in data/scholarships.csv
// (scraped listings — see data/README.md). Re-import the CSV on its own at any
// time with `npm run db:import:scholarships`.
const SCHOLARSHIPS = [
  { title: 'STEM Excellence Award 2026', provider: 'ATG Foundation', amount: 2500, description: 'Awarded to outstanding STEM candidates with a verified work history.' },
  { title: 'Global Career Grant', provider: 'Concordia Trust', amount: 1500, description: 'Supports international relocation costs for approved placements.' },
  ...loadScholarshipCsv(),
];

function loadScholarshipCsv() {
  const csvPath = path.join(__dirname, '..', 'data', 'scholarships.csv');
  if (!fs.existsSync(csvPath)) {
    warn(`No scholarship CSV at ${csvPath}; seeding curated scholarships only.`);
    return [];
  }
  return toRecords(fs.readFileSync(csvPath, 'utf8'));
}

const CANDIDATES = [
  { first: 'Nadeesha', last: 'Wickramasinghe', country: 'Sri Lanka', city: 'Colombo', university: 'University of Colombo', field: 'Computer Science', role: 'Frontend Developer', skills: ['React', 'TypeScript', 'Tailwind CSS'], jobTitle: 'Frontend Developer', employer: 'Codegen Sri Lanka', pkg: 'Premium' },
  { first: 'Kasun', last: 'Perera', country: 'Sri Lanka', city: 'Kandy', university: 'University of Peradeniya', field: 'Software Engineering', role: 'Backend Developer', skills: ['Node.js', 'MySQL', 'REST APIs'], jobTitle: 'Software Engineer', employer: 'IFS Sri Lanka', pkg: 'Trial' },
  { first: 'Ishara', last: 'Fernando', country: 'Sri Lanka', city: 'Galle', university: 'SLIIT', field: 'Information Technology', role: 'Full Stack Developer', skills: ['React', 'Node.js', 'MySQL'], jobTitle: 'Junior Full Stack Developer', employer: 'Zone24x7', pkg: 'Professional' },
  { first: 'Dinusha', last: 'Rajapaksha', country: 'Sri Lanka', city: 'Colombo', university: 'NSBM Green University', field: 'Data Science', role: 'Data Scientist', skills: ['Python', 'Pandas', 'SQL'], jobTitle: 'Data Analyst', employer: 'Dialog Axiata', pkg: 'Trial' },
  { first: 'Tharindu', last: 'Silva', country: 'Sri Lanka', city: 'Negombo', university: 'University of Moratuwa', field: 'Computer Engineering', role: 'DevOps Engineer', skills: ['Docker', 'Kubernetes', 'AWS'], jobTitle: 'DevOps Engineer', employer: 'Sysco LABS', pkg: 'Premium' },
  { first: 'Amara', last: 'Jayasuriya', country: 'Sri Lanka', city: 'Colombo', university: 'SLIIT', field: 'Interactive Media', role: 'UI/UX Designer', skills: ['Figma', 'Adobe XD', 'Communication'], jobTitle: 'UI/UX Designer', employer: 'Arimac Lanka', pkg: 'Trial' },
  { first: 'Priya', last: 'Sharma', country: 'India', city: 'Bangalore', university: 'Indian Institute of Technology', field: 'Computer Science', role: 'Mobile Developer (React Native)', skills: ['React Native', 'TypeScript', 'JavaScript'], jobTitle: 'Mobile App Developer', employer: 'Infosys', pkg: 'Professional' },
  { first: 'Ahmed', last: 'Al-Farsi', country: 'United Arab Emirates', city: 'Dubai', university: 'American University of Sharjah', field: 'Cybersecurity', role: 'Cybersecurity Analyst', skills: ['Linux/Bash', 'Python', 'AWS'], jobTitle: 'Security Analyst', employer: 'Emirates NBD', pkg: 'Trial' },
  { first: 'Maria', last: 'Santos', country: 'Philippines', city: 'Manila', university: 'University of the Philippines', field: 'Business Analytics', role: 'Business Analyst', skills: ['SQL', 'Jira', 'Communication'], jobTitle: 'Business Analyst', employer: 'Accenture', pkg: 'Trial' },
  { first: 'John', last: 'Okafor', country: 'Nigeria', city: 'Lagos', university: 'University of Lagos', field: 'Information Systems', role: 'Cloud Architect', skills: ['AWS', 'Azure', 'Terraform'], jobTitle: 'Cloud Engineer', employer: 'Interswitch', pkg: 'Premium' },
];

const OPERATORS = [
  { first: 'Operator', last: 'One', capacity: 20 },
  { first: 'Operator', last: 'Two', capacity: 15 },
  { first: 'Operator', last: 'Three', capacity: 25 },
  { first: 'Operator', last: 'Four', capacity: 10 },
  { first: 'Operator', last: 'Five', capacity: 30 },
];

const APP_STATUSES = ['pending_approval', 'requested', 'approved', 'rejected'];

async function main() {
  let existingUsers;
  try {
    existingUsers = await prisma.user.count();
  } catch (e) {
    console.error(`\n${c.red}✖ Could not read the "User" table.${c.reset} ${e.message.split('\n')[0]}`);
    console.error(`  Have migrations been applied? Run: ${c.bold}npx prisma migrate deploy${c.reset}\n`);
    process.exit(1);
  }

  if (existingUsers > 0 && !FORCE) {
    warn(`Database already has ${existingUsers} user(s) — skipping seed.`);
    log(`Run ${c.bold}node prisma/seed.js --force${c.reset} to wipe and reseed anyway.\n`);
    await prisma.$disconnect();
    return;
  }

  if (FORCE) await wipeAll();

  const password = await argon2.hash(SEED_PASSWORD);

  head('ADMIN');
  const admin = await prisma.user.create({
    data: { email: 'admin@atg.com', name: 'Admin User', password, role: 'admin' },
  });
  done(`Admin: ${admin.email}`);

  head('OPERATORS');
  const operators = [];
  for (let i = 0; i < OPERATORS.length; i++) {
    const o = OPERATORS[i];
    const user = await prisma.user.create({
      data: {
        email: `operator${i + 1}@atg.com`,
        name: `${o.first} ${o.last}`,
        password,
        role: 'operator',
        capacity: o.capacity,
      },
    });
    operators.push(user);
    done(`Operator: ${user.email} (capacity ${o.capacity})`);
  }

  head('JOB ROLES');
  const jobRoles = {};
  for (const name of JOB_ROLES) {
    jobRoles[name] = await prisma.jobRole.create({ data: { name, status: 'active' } });
  }
  done(`${JOB_ROLES.length} job roles created.`);

  head('SKILLS');
  const skills = {};
  for (const s of SKILLS) {
    skills[s.name] = await prisma.skill.create({ data: { ...s, status: 'active' } });
  }
  done(`${SKILLS.length} skills created.`);

  head('COMPANIES');
  const companyNames = [...new Set(JOBS.map((j) => j.company))];
  const companies = {};
  for (const name of companyNames) {
    companies[name] = await prisma.company.create({
      data: {
        name,
        email: `careers@${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.example.com`,
        status: 'approved',
      },
    });
  }
  done(`${companyNames.length} companies created.`);

  head('JOBS');
  const createdJobs = [];
  for (const j of JOBS) {
    const jr = jobRoles[j.jobRoleName];
    const company = companies[j.company];
    const job = await prisma.job.create({
      data: {
        company: j.company,
        companyId: company.id,
        title: j.title,
        location: j.location,
        experience: j.experience,
        locationType: j.locationType,
        status: 'approved',
        jobRoleId: jr?.id ?? null,
      },
    });
    for (const [idx, sName] of j.skills.entries()) {
      const sk = skills[sName];
      if (sk) {
        await prisma.jobSkill.create({ data: { jobId: job.id, skillId: sk.id, weight: 5 - idx } });
      }
    }
    createdJobs.push(job);
  }
  done(`${createdJobs.length} jobs created with skills attached.`);

  head('SCHOLARSHIPS');
  await prisma.scholarship.createMany({ data: SCHOLARSHIPS });
  done(`${SCHOLARSHIPS.length} scholarships created.`);

  head('CANDIDATES');
  const candidates = [];
  for (let i = 0; i < CANDIDATES.length; i++) {
    const cd = CANDIDATES[i];
    const email = `candidate${i + 1}@atg.com`;
    const user = await prisma.user.create({
      data: {
        email,
        name: `${cd.first} ${cd.last}`,
        password,
        role: 'candidate',
        country: cd.country,
        city: cd.city,
        pkg: cd.pkg,
        appsTotal: cd.pkg === 'Professional' ? 100 : cd.pkg === 'Premium' ? 20 : 2,
        appsUsed: 0,
      },
    });

    await prisma.userProfile.create({
      data: {
        userId: user.id,
        firstName: cd.first,
        lastName: cd.last,
        gender: i % 2 === 0 ? 'Female' : 'Male',
        dob: new Date(1994 + (i % 8), i % 12, 10 + (i % 15)),
        correspondenceLanguage: 'English',
        nationalityAtBirth: cd.country,
        currentNationality: cd.country,
        legalResidency: cd.country,
        maritalStatus: i % 3 === 0 ? 'Married' : 'Single',
        closestCity: cd.city,
      },
    });

    await prisma.userPhone.create({
      data: { userId: user.id, phoneType: 'Mobile', phoneNumber: `+94 7${i}1 ${100000 + i * 111}` },
    });

    await prisma.userAddress.create({
      data: {
        userId: user.id,
        address: `${10 + i}, Main Street`,
        city: cd.city,
        postalCode: `${10000 + i}`,
        state: cd.city,
        country: cd.country,
      },
    });

    await prisma.userAcademicQualification.create({
      data: {
        userId: user.id,
        degreeLevel: 'BSc Honours',
        diplomaObtained: 'Yes',
        fromDate: new Date(2016 + (i % 4), 8, 1),
        toDate: new Date(2020 + (i % 4), 5, 30),
        mainField: cd.field,
        university: cd.university,
      },
    });

    await prisma.userLanguage.create({
      data: { userId: user.id, language: 'English', level: 'Fluent' },
    });

    await prisma.userExperience.create({
      data: {
        userId: user.id,
        jobTitle: cd.jobTitle,
        employer: cd.employer,
        location: `${cd.city}, ${cd.country}`,
        employmentType: 'Full-time',
        startDate: new Date(2022 + (i % 3), i % 12, 1),
        isCurrent: true,
        responsibilities: `Working as a ${cd.jobTitle} focused on ${cd.role.toLowerCase()} responsibilities.`,
      },
    });

    for (const sName of cd.skills) {
      const sk = skills[sName];
      if (sk) {
        await prisma.userSkill.create({ data: { userId: user.id, skillId: sk.id, proficiency: 4 } });
      }
    }

    const jr = jobRoles[cd.role];
    if (jr) {
      await prisma.userJobRole.create({ data: { userId: user.id, jobRoleId: jr.id } });
    }

    candidates.push(user);
    done(`Candidate: ${email} (${cd.first} ${cd.last} — ${cd.role})`);
  }

  head('APPLICATIONS');
  let appCount = 0;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const staff = operators[i % operators.length];
    // Each candidate applies to two jobs that match their role, falling back to any job.
    const matchedJobs = createdJobs.filter((j) => j.jobRoleId === jobRoles[CANDIDATES[i].role]?.id);
    const targets = (matchedJobs.length ? matchedJobs : createdJobs).slice(0, 2);
    for (const [idx, job] of targets.entries()) {
      await prisma.candidateApplication.create({
        data: {
          userId: candidate.id,
          jobId: job.id,
          staffId: staff.id,
          fitScore: 65 + ((i * 7 + idx * 5) % 30),
          successRate: 50 + ((i * 5 + idx * 3) % 40),
          status: APP_STATUSES[(i + idx) % APP_STATUSES.length],
        },
      });
      appCount++;
    }
    await prisma.user.update({ where: { id: candidate.id }, data: { appsUsed: targets.length } });
  }
  done(`${appCount} applications created across ${candidates.length} candidates.`);

  head('PROFILE QUESTION CATALOGUE');
  // The 20-chapter candidate profile questionnaire lives in
  // data/profile-catalog.csv and is the schema the profile builder renders, so
  // a freshly seeded database is unusable without it.
  const catalogue = await seedProfileSchema();
  done(`${catalogue.sections} chapters and ${catalogue.fields} profile questions seeded.`);

  head('SUMMARY');
  console.log(`
${c.bold}${c.green}  Database seeded successfully!${c.reset}

  ${c.bold}Login credentials (all use password: ${SEED_PASSWORD})${c.reset}
  • Admin      : admin@atg.com
  • Operators  : operator1@atg.com … operator${OPERATORS.length}@atg.com
  • Candidates : candidate1@atg.com … candidate${CANDIDATES.length}@atg.com

  ${c.bold}Seeded data${c.reset}
  • 1 admin, ${OPERATORS.length} operators, ${CANDIDATES.length} candidates (full profiles)
  • ${companyNames.length} companies, ${JOB_ROLES.length} job roles, ${SKILLS.length} skills
  • ${createdJobs.length} jobs (with skills attached)
  • ${SCHOLARSHIPS.length} scholarships
  • ${appCount} candidate applications
  • ${catalogue.sections} profile chapters, ${catalogue.fields} profile questions
  `);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(`\n${c.red}✖ Seed failed:${c.reset}`, e.message);
    await prisma.$disconnect();
    process.exit(1);
  });
