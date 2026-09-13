// server/prisma/seed.js
// Run with: npm run db:seed
//
// ⚠️  WARNING: This script DELETES ALL EXISTING DATA then inserts fresh demo records.
//     Only run against a LOCAL PostgreSQL database — never against Neon / production.
//
// Determinism guarantee:
//   - All randomness uses a seeded LCG PRNG (no Math.random()).
//   - Reference date is fixed so date arithmetic is reproducible.
//   - Running this script twice always produces structurally identical data.

'use strict';
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── Seeded PRNG ─────────────────────────────────────────────────────────────
// Linear Congruential Generator — no external dependency.
// SEED is fixed so every run produces the same dataset.
const SEED = 20260914;

class SeededRandom {
  constructor(seed) {
    this.s = seed >>> 0;
  }
  /** Returns a float in [0, 1). */
  next() {
    this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0;
    return this.s / 4294967296;
  }
  /** Returns an integer in [lo, hi] inclusive. */
  int(lo, hi) {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }
  /** Picks a random element from an array. */
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
  /**
   * Picks an element using weighted probabilities.
   * items and weights must be the same length.
   */
  weighted(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}

const rng = new SeededRandom(SEED);

// ─── Fixed Reference Date ─────────────────────────────────────────────────────
// Using a fixed date makes all daysAgo / daysAhead calls reproducible.
const REF = new Date('2026-09-14T00:00:00.000Z');
const ago   = (days) => new Date(REF.getTime() - days * 86_400_000);
const ahead = (days) => new Date(REF.getTime() + days * 86_400_000);

// ─── Financial Helpers ────────────────────────────────────────────────────────
/** Round to 2 decimal places. */
const r2 = (n) => Math.round(n * 100) / 100;

/** Compute total loan amount: principal × (1 + rate%). */
function loanTotal(principal, ratePct) {
  return r2(principal * (1 + ratePct / 100));
}

/**
 * Split totalPaid into exactly n installment amounts that sum to totalPaid.
 * Uses the PRNG for variation. Returns fewer elements if some round to 0.
 */
function makeInstallments(totalPaid, n) {
  if (n <= 0 || totalPaid <= 0) return [];
  if (n === 1) return [totalPaid];

  // Generate n proportions in [0.5, 1.5], then scale to totalPaid.
  const props = Array.from({ length: n }, () => 0.5 + rng.next());
  const propSum = props.reduce((a, b) => a + b, 0);

  // Round each share; adjust the last element to make the sum exact.
  const parts = props.map((p) => r2((p / propSum) * totalPaid));
  const headSum = parts.slice(0, -1).reduce((a, b) => a + b, 0);
  parts[parts.length - 1] = r2(Math.max(0, totalPaid - headSum));

  return parts.filter((x) => x > 0);
}

// ─── Name Pools ───────────────────────────────────────────────────────────────

const IND_FIRST = [
  'Aarav',   'Aditya',  'Akash',   'Amit',    'Ankit',   'Arjun',   'Arvind',  'Deepak',
  'Gaurav',  'Harsh',   'Karan',   'Kunal',   'Manish',  'Mohit',   'Nikhil',  'Piyush',
  'Prateek', 'Rahul',   'Rajesh',  'Ritesh',  'Rohan',   'Sanjay',  'Shubham', 'Sumit',
  'Suresh',  'Varun',   'Vikram',  'Vivek',   'Yash',    'Dinesh',  'Abhinav', 'Sandeep',
  'Tarun',   'Rishi',   'Jayesh',  'Chirag',  'Manoj',   'Praveen', 'Girish',  'Hemant',
  'Ananya',  'Divya',   'Ishita',  'Kavya',   'Kritika', 'Meera',   'Neha',    'Nisha',
  'Pooja',   'Priya',   'Riya',    'Sakshi',  'Simran',  'Sneha',   'Sonal',   'Swati',
  'Tanvi',   'Tanya',   'Varsha',  'Vidya',   'Reena',   'Sunita',  'Geeta',   'Rekha',
  'Anjali',  'Preeti',  'Radhika', 'Shruti',  'Nidhi',   'Ruchi',   'Lalit',   'Nitin',
  'Vikas',   'Naresh',  'Sunil',   'Ramesh',  'Vinod',   'Mukesh',  'Rajiv',   'Yogesh',
];

const IND_LAST = [
  'Agarwal',     'Bhat',        'Choudhary',   'Das',         'Deshpande',
  'Ghosh',       'Gupta',       'Iyer',        'Jain',        'Joshi',
  'Kapoor',      'Kaur',        'Khan',        'Kumar',       'Malhotra',
  'Mehta',       'Menon',       'Mishra',      'Nair',        'Patel',
  'Pathak',      'Pillai',      'Rao',         'Reddy',       'Saxena',
  'Shah',        'Sharma',      'Singh',       'Sinha',       'Srivastava',
  'Thakur',      'Tiwari',      'Tripathi',    'Verma',       'Yadav',
  'Banerjee',    'Chakraborty', 'Mukherjee',   'Bose',        'Roy',
  'Pandey',      'Dwivedi',     'Shukla',      'Bajpai',      'Naidu',
  'Rajan',       'Krishnan',    'Subramaniam', 'Hegde',       'Kulkarni',
  'Desai',       'Chavan',      'More',        'Pawar',       'Jadhav',
  'Sawant',      'Negi',        'Rawat',       'Dixit',       'Bajaj',
];

const INTL_FIRST = [
  'James',      'John',       'Robert',     'Michael',    'William',    'David',
  'Richard',    'Emma',       'Sarah',      'Jessica',    'Emily',      'Linda',
  'Barbara',    'Carlos',     'Maria',      'Omar',       'Fatima',     'Wei',
  'Chen',       'Aisha',      'Lucas',      'Sofia',      'Alessandro', 'Yuki',
  'Mohammed',   'Elena',      'Hiroshi',    'Amara',
];

const INTL_LAST = [
  'Smith',      'Johnson',    'Williams',   'Brown',      'Jones',      'Garcia',
  'Miller',     'Davis',      'Martinez',   'Wilson',     'Anderson',   'Taylor',
  'Thomas',     'Jackson',    'White',      'Harris',     'Li',         'Wang',
  'Zhang',      'Al-Hassan',  'Nguyen',     'Santos',     'Fernandez',  'Mueller',
  'Nakamura',   'Okonkwo',    'Rossi',      'Andersen',
];

// ─── Location Pools ──────────────────────────────────────────────────────────

// [city, state] pairs
const IND_CITIES = [
  ['Mumbai',         'Maharashtra'],
  ['Delhi',          'Delhi'],
  ['Bengaluru',      'Karnataka'],
  ['Hyderabad',      'Telangana'],
  ['Chennai',        'Tamil Nadu'],
  ['Pune',           'Maharashtra'],
  ['Kolkata',        'West Bengal'],
  ['Ahmedabad',      'Gujarat'],
  ['Jaipur',         'Rajasthan'],
  ['Lucknow',        'Uttar Pradesh'],
  ['Patna',          'Bihar'],
  ['Kochi',          'Kerala'],
  ['Chandigarh',     'Punjab'],
  ['Indore',         'Madhya Pradesh'],
  ['Surat',          'Gujarat'],
  ['Bhubaneswar',    'Odisha'],
  ['Ranchi',         'Jharkhand'],
  ['Nagpur',         'Maharashtra'],
  ['Noida',          'Uttar Pradesh'],
  ['Gurugram',       'Haryana'],
  ['Coimbatore',     'Tamil Nadu'],
  ['Vadodara',       'Gujarat'],
  ['Visakhapatnam',  'Andhra Pradesh'],
  ['Amritsar',       'Punjab'],
  ['Mysuru',         'Karnataka'],
];

const INTL_CITIES = [
  ['London',        'UK'],
  ['Singapore',     'Singapore'],
  ['Dubai',         'UAE'],
  ['Toronto',       'Canada'],
  ['Sydney',        'Australia'],
  ['Kuala Lumpur',  'Malaysia'],
];

const STREETS = [
  'MG Road',          'Gandhi Nagar',       'Nehru Street',      'Patel Nagar',
  'Indira Colony',    'Subhash Chowk',      'Sarojini Nagar',    'Bose Street',
  'Ambedkar Road',    'Tagore Lane',        'Tilak Path',        'Shivaji Nagar',
  'Vivekananda Road', 'Anand Vihar',        'Civil Lines',       'Model Town',
  'Old Town',         'Sector 12',          'Sector 18',         'Cross Road',
  'Main Market',      'Phase 2',            'New Colony',        'Defence Colony',
  'Ashok Nagar',      'Rajiv Gandhi Road',  'Lal Bahadur Marg',  'Netaji Subhash Path',
];

// ─── Note Pools ──────────────────────────────────────────────────────────────

const REPAYMENT_NOTES = [
  'Monthly EMI payment',
  'Partial payment via UPI',
  'Cash payment collected during visit',
  'Payment via NEFT transfer',
  'Online payment via net banking',
  'Cheque deposit received',
  'Payment made after follow-up call',
  'Regular scheduled installment',
  'Advance payment received',
  'Partial recovery from delinquent account',
  'Settlement payment received',
  'Installment collected at branch',
  'Payment received via IMPS',
  'EMI — auto-debit processed',
  'Payment received post-reminder',
  'Overdue amount partially collected',
  'Part-payment as per revised schedule',
];

// Activity notes keyed by ACTIVITYTYPE_OUTCOME
const ACTIVITY_NOTES = {
  CALL_CONTACTED: [
    'Customer confirmed next EMI is on schedule.',
    'Discussed repayment plan; customer cooperative and acknowledged balance.',
    'Verified current address and employment status.',
    'Regular check-in call — account on track.',
    'Customer requested extension on due date; under review.',
    'Informed customer of upcoming due date; confirmed receipt.',
    'Customer confirmed payment will be made before month end.',
    'Discussed loan restructuring options; customer considering.',
    'Customer agreed to maintain existing repayment schedule.',
    'Account status reviewed; customer is aware of outstanding dues.',
  ],
  CALL_NO_ANSWER: [
    'No answer; will retry tomorrow.',
    'Phone switched off after 3 attempts.',
    'Call unanswered — left a note to call back.',
    'Number busy; will retry in 2 hours.',
    'No response on mobile; attempting alternate contact.',
    'Customer unreachable; scheduled follow-up.',
  ],
  CALL_PROMISE_TO_PAY: [
    'Customer promised to pay overdue amount by end of week.',
    'Customer committed to EMI payment by next Monday.',
    'Promised partial payment of outstanding dues within 7 days.',
    'Customer committed to clearing full balance within 30 days.',
    'Customer agreed to pay after salary credit.',
    'Customer will arrange funds and pay within 10 days.',
  ],
  CALL_REFUSED: [
    'Customer refused to discuss repayment and disconnected.',
    'Customer denies responsibility for loan; disputed.',
    'Hostile response — escalating to manager.',
    'Customer claims financial hardship; unwilling to commit.',
    'Refused to engage; planning field visit.',
  ],
  CALL_PAID: [
    'Customer confirmed UPI payment during call; verified in system.',
    'Online payment completed via link sent during call.',
    'EMI collected via payment gateway during call.',
  ],
  CALL_LEFT_MESSAGE: [
    'Left voicemail requesting callback by EOD.',
    'Message left with a family member.',
    'Left message with office colleague.',
    'Voice message left; awaiting callback.',
  ],
  VISIT_CONTACTED: [
    'Home visit successful; customer cooperative and documents verified.',
    'Met customer at residence; discussed outstanding balance.',
    'Field visit completed; address verified and customer acknowledged dues.',
    'Customer provided post-dated cheques during visit.',
    'Customer met at office; loan account reviewed together.',
  ],
  VISIT_NO_ANSWER: [
    'Customer not home; neighbour confirmed still residing at address.',
    'No answer at door despite multiple attempts.',
    'Premises locked; will revisit next week.',
    'Customer unavailable; notice left at door.',
  ],
  VISIT_PROMISE_TO_PAY: [
    'Home visit — customer committed to paying within this week.',
    'Customer showed willingness to settle after field discussion.',
    'Payment commitment obtained; customer signed acknowledgement.',
    'Customer agreed to pay in two instalments.',
    'Customer promised to pay 50% now and rest within 15 days.',
  ],
  VISIT_REFUSED: [
    'Customer refused to open door despite multiple attempts.',
    'Customer asked agent to leave premises.',
    'Refused to engage — escalating to manager.',
    'Customer was uncooperative; legal notice left.',
  ],
  VISIT_PAID: [
    'Cash payment collected during home visit.',
    'Cheque collected at customer residence.',
    'Part-payment collected in field; receipt issued.',
    'Full settlement collected during visit.',
  ],
  VISIT_LEFT_MESSAGE: [
    'Left notice at door with agent contact details.',
    'Written message handed to family member.',
    'Dropped formal notice under door.',
  ],
  EMAIL_CONTACTED: [
    'Payment reminder email sent; read receipt confirmed.',
    'Sent updated account statement via email.',
    'Email regarding upcoming due date sent and acknowledged.',
    'Loan summary and outstanding balance emailed to customer.',
    'Restructuring offer sent via email; awaiting response.',
  ],
  EMAIL_NO_ANSWER: [
    'No response to email reminder within 48 hours.',
    'Email bounced — invalid address on file; updating records.',
    'Follow-up email sent; no reply received.',
  ],
  EMAIL_PROMISE_TO_PAY: [
    'Customer replied via email confirming payment by next week.',
    'Written payment commitment received over email.',
  ],
  EMAIL_REFUSED: [
    'Customer sent email disputing the outstanding loan amount.',
    'Customer unsubscribed from communications; noted.',
  ],
  EMAIL_LEFT_MESSAGE: [
    'Email sent with agent contact details requesting callback.',
    'Sent follow-up email requesting response.',
  ],
  SMS_CONTACTED: [
    'Overdue payment SMS alert sent to registered number.',
    'EMI due date SMS reminder dispatched.',
    'Account status SMS sent; delivery confirmed.',
    'SMS reminder sent 7 days before due date.',
    'EMI reminder SMS — 3 days to due date.',
  ],
  SMS_NO_ANSWER: [
    'SMS sent; no response received after 24 hours.',
    'SMS delivery failed — number may be invalid; updating records.',
  ],
  SMS_LEFT_MESSAGE: [
    'SMS with agent callback number sent.',
    'Reminder SMS with outstanding amount dispatched.',
  ],
  PAYMENT_REMINDER_CONTACTED: [
    'Monthly payment reminder dispatched; customer acknowledged.',
    'Automated pre-due-date reminder sent; customer confirmed receipt.',
    'Reminder sent 7 days before due date; customer noted.',
    'EMI reminder sent — 3 days to due date.',
    'Customer confirmed receipt of payment reminder and will act.',
  ],
  PAYMENT_REMINDER_PROMISE_TO_PAY: [
    'Customer responded to reminder; confirmed payment this week.',
    'Payment commitment received as a result of reminder.',
  ],
  PAYMENT_REMINDER_LEFT_MESSAGE: [
    'Reminder left on voicemail.',
    'Written payment reminder delivered at registered address.',
  ],
};

/** Retrieve a note for the given activityType + outcome combination. */
function getNote(type, outcome) {
  const key = `${type}_${outcome}`;
  const pool = ACTIVITY_NOTES[key] || ACTIVITY_NOTES[`${type}_CONTACTED`] || ['Activity logged.'];
  return rng.pick(pool);
}

// ─── Contact Helpers ──────────────────────────────────────────────────────────

/** Generate a unique Indian mobile number. idx must be unique per call. */
function makePhone(idx) {
  // +91 followed by 10 digits starting with 9
  return `+91 9${String(100000000 + idx).slice(1)}`;
}

/** Generate a unique email from name + numeric index. */
function makeEmail(first, last, idx) {
  const f = first.toLowerCase().replace(/[^a-z]/g, '');
  const l = last.toLowerCase().replace(/[^a-z]/g, '');
  const domains = ['gmail.com', 'yahoo.co.in', 'outlook.com', 'hotmail.com', 'rediffmail.com'];
  return `${f}.${l}${idx}@${domains[idx % domains.length]}`;
}

/** Generate a realistic street address. */
function makeAddress(city, state) {
  const num    = rng.int(1, 500);
  const street = rng.pick(STREETS);
  return `${num}, ${street}, ${city}, ${state}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Starting improved seed...\n');

  // ── Safety check: refuse to run against Neon / production unless explicitly allowed ─
  const dbUrl = process.env.DATABASE_URL || '';
  const isNeon =
    dbUrl.includes('neon.tech') ||
    dbUrl.includes('neon.database') ||
    dbUrl.includes('neon.db') ||
    dbUrl.includes('aws.neon');
  const allowProd = process.env.SEED_ALLOW_PRODUCTION === 'true';

  if (isNeon) {
    if (!allowProd) {
      console.error('');
      console.error('❌  SAFETY ABORT');
      console.error('   DATABASE_URL appears to point to a Neon (production) database.');
      console.error('   To run against production, you must explicitly set SEED_ALLOW_PRODUCTION=true');
      console.error('   Otherwise, update server/.env to your LOCAL PostgreSQL connection string.');
      console.error('');
      process.exit(1);
    }
    console.log('  ⚠️  WARNING: Seeding PRODUCTION Neon database due to SEED_ALLOW_PRODUCTION=true');
  } else {
    if (allowProd) {
      console.error('');
      console.error('❌  SAFETY ABORT');
      console.error('   SEED_ALLOW_PRODUCTION=true is set, but DATABASE_URL does not appear to be Neon.');
      console.error('   Please check your configuration to avoid clearing the wrong database.');
      console.error('');
      process.exit(1);
    }
    console.log('  ✓ DATABASE_URL looks local — proceeding safely.');
  }

  // ── Cleanup (FK order: activities → repayments → loans → customers → users) ─
  await prisma.collectionActivity.deleteMany();
  await prisma.repayment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  console.log('  ✓ Cleared existing data');

  // Hash password once — reused for all demo accounts
  const PWD = await bcrypt.hash('password123', 10);

  // ══════════════════════════════════════════════════════════════════════════
  // 1. USERS  — 1 Admin, 2 Managers, 8 Collection Agents
  // ══════════════════════════════════════════════════════════════════════════
  const USER_DEFS = [
    // ADMIN
    { name: 'Rajesh Kumar',     email: 'admin@demo.com',     role: 'ADMIN'            },
    // MANAGERS
    { name: 'Ananya Singh',     email: 'manager1@demo.com',  role: 'MANAGER'          },
    { name: 'James Carter',     email: 'manager2@demo.com',  role: 'MANAGER'          },
    // COLLECTION AGENTS
    { name: 'Vikram Patel',     email: 'agent1@demo.com',    role: 'COLLECTION_AGENT' },
    { name: 'Priya Nair',       email: 'agent2@demo.com',    role: 'COLLECTION_AGENT' },
    { name: 'Rahul Mehta',      email: 'agent3@demo.com',    role: 'COLLECTION_AGENT' },
    { name: 'Sneha Iyer',       email: 'agent4@demo.com',    role: 'COLLECTION_AGENT' },
    { name: 'Arjun Verma',      email: 'agent5@demo.com',    role: 'COLLECTION_AGENT' },
    { name: 'Neha Reddy',       email: 'agent6@demo.com',    role: 'COLLECTION_AGENT' },
    { name: 'Daniel Brown',     email: 'agent7@demo.com',    role: 'COLLECTION_AGENT' },
    { name: 'Kavya Gupta',      email: 'agent8@demo.com',    role: 'COLLECTION_AGENT' },
  ];

  const users = [];
  for (const u of USER_DEFS) {
    const user = await prisma.user.create({
      data: { ...u, password: PWD, isActive: true },
    });
    users.push(user);
  }

  const [admin, mgr1, mgr2] = users;
  const managers = [mgr1, mgr2];
  const agents   = users.slice(3); // 8 agents

  console.log(`  ✓ Created ${users.length} users (1 Admin, 2 Managers, 8 Agents)`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. CUSTOMERS  — 100 total (72 Indian, 28 international)
  // ══════════════════════════════════════════════════════════════════════════

  // Build name pairs
  const namePairs = [];
  for (let i = 0; i < 72; i++) {
    namePairs.push({
      first:  IND_FIRST[i % IND_FIRST.length],
      last:   IND_LAST[i  % IND_LAST.length],
      indian: true,
    });
  }
  for (let i = 0; i < 28; i++) {
    namePairs.push({
      first:  INTL_FIRST[i % INTL_FIRST.length],
      last:   INTL_LAST[i  % INTL_LAST.length],
      indian: false,
    });
  }

  // Fisher-Yates shuffle (deterministic via seeded RNG)
  for (let i = namePairs.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [namePairs[i], namePairs[j]] = [namePairs[j], namePairs[i]];
  }

  // Assign customers to agents in round-robin so each agent gets exactly 12–13
  const customers = []; // { id, agentId }
  for (let i = 0; i < 100; i++) {
    const np    = namePairs[i];
    const agent = agents[i % agents.length]; // balanced round-robin
    const [city, state] = np.indian
      ? IND_CITIES[i % IND_CITIES.length]
      : INTL_CITIES[i % INTL_CITIES.length];

    const c = await prisma.customer.create({
      data: {
        fullName:       `${np.first} ${np.last}`,
        email:          makeEmail(np.first, np.last, i + 1),
        phone:          makePhone(i + 1),
        address:        makeAddress(city, state),
        nationalId:     `IND${String(i + 1).padStart(6, '0')}`, // IND000001…IND000100
        assignedAgentId: agent.id,
      },
    });
    customers.push({ id: c.id, agentId: agent.id });
  }

  console.log(`  ✓ Created ${customers.length} customers`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. LOANS  — 115 total
  //    5 customers with 0 loans, 20 with 2 loans, 75 with 1 loan
  //    → (75×1) + (20×2) + (5×0) = 115
  // ══════════════════════════════════════════════════════════════════════════

  // Determine loan count per customer (fixed indices for determinism)
  const LOAN_COUNT = new Array(100).fill(1);
  // 5 customers with 0 loans
  for (const ci of [3, 17, 32, 55, 78]) LOAN_COUNT[ci] = 0;
  // 20 customers with 2 loans (no overlap with zero set)
  for (const ci of [0, 6, 12, 20, 27, 34, 41, 48, 54, 61, 67, 74, 81, 88, 95, 8, 15, 25, 36, 50]) {
    LOAN_COUNT[ci] = 2;
  }

  const LOAN_STATUSES = ['ACTIVE', 'CLOSED', 'OVERDUE', 'DEFAULTED'];
  const STAT_WEIGHTS  = [40, 25, 20, 15]; // % distribution

  // Interest rates representative of Indian NBFC/microfinance products
  const RATES = [10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0,
                 15.0, 16.0, 17.5, 18.0, 19.5, 21.0, 22.5, 24.0];

  // Principal amount bands (in INR)
  const BANDS = [
    { lo: 25000,   hi: 75000,   weight: 30 }, // small  / micro
    { lo: 100000,  hi: 500000,  weight: 50 }, // medium / personal
    { lo: 500000,  hi: 2000000, weight: 20 }, // large  / business
  ];

  function pickPrincipal() {
    const totalW = BANDS.reduce((s, b) => s + b.weight, 0);
    let r = rng.next() * totalW;
    for (const b of BANDS) {
      r -= b.weight;
      if (r <= 0) {
        // Round to nearest 5 000 for realism
        const steps = Math.floor((b.hi - b.lo) / 5000);
        return b.lo + rng.int(0, steps) * 5000;
      }
    }
    return 100000;
  }

  // loans[] stores metadata needed when generating repayments & activities
  const loans = [];

  for (let ci = 0; ci < customers.length; ci++) {
    const cust = customers[ci];
    for (let li = 0; li < LOAN_COUNT[ci]; li++) {
      const principal = pickPrincipal();
      const rate      = rng.pick(RATES);
      const total     = loanTotal(principal, rate);
      const status    = rng.weighted(LOAN_STATUSES, STAT_WEIGHTS);

      // ── Date logic per status ────────────────────────────────────────────
      let createdAt, dueDate, amountPaid, outstandingBalance;

      if (status === 'ACTIVE') {
        // Loan is young; due date is in the future
        const createdDaysAgo = rng.int(30, 365);
        createdAt = ago(createdDaysAgo);
        dueDate   = ahead(rng.int(30, 365));
        // 10% chance of zero payments (new or stalled account)
        const paidPct = rng.next() < 0.10 ? 0 : rng.next() * 0.75;
        amountPaid = r2(total * paidPct);

      } else if (status === 'CLOSED') {
        // Loan fully repaid; both creation and due date are in the past
        const createdDaysAgo = rng.int(180, 730);
        createdAt = ago(createdDaysAgo);
        dueDate   = ago(rng.int(30, Math.max(31, createdDaysAgo - 30)));
        amountPaid = total; // 100% paid — exact value, no FP drift

      } else if (status === 'OVERDUE') {
        // Due date already passed; some payment may have been made
        const createdDaysAgo = rng.int(60, 500);
        createdAt = ago(createdDaysAgo);
        dueDate   = ago(rng.int(5, Math.max(10, createdDaysAgo - 10)));
        // 25% chance of zero payments (completely delinquent)
        const paidPct = rng.next() < 0.25 ? 0 : rng.next() * 0.65;
        amountPaid = r2(total * paidPct);

      } else { // DEFAULTED
        // Significantly overdue; low payment recovery expected
        const createdDaysAgo = rng.int(180, 730);
        createdAt = ago(createdDaysAgo);
        dueDate   = ago(rng.int(60, Math.max(61, createdDaysAgo - 30)));
        // 40% chance of zero payments (complete default)
        const paidPct = rng.next() < 0.40 ? 0 : rng.next() * 0.40;
        amountPaid = r2(total * paidPct);
      }

      outstandingBalance = status === 'CLOSED'
        ? 0                              // explicitly zero for CLOSED
        : r2(Math.max(0, total - amountPaid));

      const loan = await prisma.loan.create({
        data: {
          customerId:        cust.id,
          principalAmount:   principal,
          interestRate:      rate,
          totalAmount:       total,
          amountPaid,
          outstandingBalance,
          dueDate,
          status,
          createdAt,         // backdate so dashboard charts show history
        },
      });

      loans.push({
        id:           loan.id,
        customerId:   cust.id,
        agentId:      cust.agentId,
        status,
        totalAmount:  total,
        amountPaid,
        createdAtMs:  createdAt.getTime(),
      });
    }
  }

  console.log(`  ✓ Created ${loans.length} loans`);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. REPAYMENTS
  //    Only created when amountPaid > 0.
  //    Installments are spread chronologically across the loan's lifetime.
  //    Sum of installments equals loan.amountPaid exactly (by construction).
  // ══════════════════════════════════════════════════════════════════════════
  let repaymentCount = 0;

  for (const loan of loans) {
    if (loan.amountPaid <= 0) continue;

    // Number of installments: more for closed/well-paid loans
    const numInst = loan.status === 'CLOSED'
      ? rng.int(3, 8)
      : loan.status === 'ACTIVE'
        ? rng.int(1, 5)
        : rng.int(1, 3);

    const installments = makeInstallments(loan.amountPaid, numInst);
    if (installments.length === 0) continue;

    // Loan age in days from creation to REF date
    const loanAgeDays = Math.max(1, Math.floor((REF.getTime() - loan.createdAtMs) / 86_400_000));

    // Generate ascending payment day-offsets (days after loan creation)
    const offsets = Array.from({ length: installments.length }, () =>
      rng.int(1, Math.max(1, loanAgeDays - 1))
    );
    offsets.sort((a, b) => a - b); // chronological order

    for (let k = 0; k < installments.length; k++) {
      const amount = installments[k];
      if (amount <= 0) continue;
      const paymentDate = new Date(loan.createdAtMs + offsets[k] * 86_400_000);

      await prisma.repayment.create({
        data: {
          loanId:      loan.id,
          amount,
          paymentDate,
          notes:       rng.pick(REPAYMENT_NOTES),
          createdAt:   paymentDate, // keeps createdAt consistent with paymentDate
        },
      });
      repaymentCount++;
    }
  }

  console.log(`  ✓ Created ${repaymentCount} repayments`);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. COLLECTION ACTIVITIES
  //    Volume is driven by the customer's worst loan status.
  //    Activities are primarily logged by the customer's assigned agent,
  //    with occasional cross-agent and manager entries for realism.
  // ══════════════════════════════════════════════════════════════════════════

  // Build: customerId → worst loan status
  const STATUS_RANK = { DEFAULTED: 4, OVERDUE: 3, ACTIVE: 2, CLOSED: 1 };
  const custWorstStatus = {};
  for (const loan of loans) {
    const cur = custWorstStatus[loan.customerId];
    if (!cur || STATUS_RANK[loan.status] > STATUS_RANK[cur]) {
      custWorstStatus[loan.customerId] = loan.status;
    }
  }

  const ACT_TYPES   = ['CALL', 'VISIT', 'EMAIL', 'SMS', 'PAYMENT_REMINDER'];
  const ACT_TYPE_WT = [40, 15, 20, 15, 10]; // CALL most common

  const OUTCOMES    = ['CONTACTED', 'NO_ANSWER', 'PROMISE_TO_PAY', 'REFUSED', 'PAID', 'LEFT_MESSAGE'];
  const OUTCOME_WT  = [35, 20, 15, 10, 10, 10];

  let activityCount = 0;

  for (const cust of customers) {
    const worstStatus = custWorstStatus[cust.id] || null;

    // Activity volume: higher for troubled accounts
    let numActs;
    if      (!worstStatus)                  numActs = rng.int(0, 2);  // no loans
    else if (worstStatus === 'DEFAULTED')   numActs = rng.int(6, 10);
    else if (worstStatus === 'OVERDUE')     numActs = rng.int(4, 8);
    else if (worstStatus === 'ACTIVE')      numActs = rng.int(2, 5);
    else /* CLOSED */                       numActs = rng.int(1, 3);

    for (let a = 0; a < numActs; a++) {
      const type    = rng.weighted(ACT_TYPES, ACT_TYPE_WT);
      const outcome = rng.weighted(OUTCOMES, OUTCOME_WT);
      const note    = getNote(type, outcome);

      // Activity date: spread across the last 12 months
      const actDaysAgo = rng.int(1, 365);
      const createdAt  = ago(actDaysAgo);

      // Follow-up date: 30% of activities have one
      let followUpDate = null;
      if (rng.next() < 0.30) {
        // ~50% past follow-ups (overdue), ~50% upcoming
        followUpDate = rng.next() < 0.50
          ? ago(rng.int(1, actDaysAgo))   // past — follow-up was missed / resolved
          : ahead(rng.int(1, 60));          // future — scheduled follow-up
      }

      // Agent selection:
      //   80% — customer's assigned agent (realistic scope)
      //   15% — any other agent (cross-coverage)
      //    5% — a manager (escalation / oversight)
      const ar = rng.next();
      let agentId;
      if      (ar < 0.80) agentId = cust.agentId;
      else if (ar < 0.95) agentId = rng.pick(agents).id;
      else                agentId = rng.pick(managers).id;

      await prisma.collectionActivity.create({
        data: {
          agentId,
          customerId:   cust.id,
          activityType: type,
          outcome,
          notes:        note,
          followUpDate,
          createdAt,
        },
      });
      activityCount++;
    }
  }

  console.log(`  ✓ Created ${activityCount} collection activities`);

  // ══════════════════════════════════════════════════════════════════════════
  // 6. VERIFICATION — Counts, distribution, and financial invariants
  // ══════════════════════════════════════════════════════════════════════════

  const [uCount, cCount, lCount, rCount, aCount] = await Promise.all([
    prisma.user.count(),
    prisma.customer.count(),
    prisma.loan.count(),
    prisma.repayment.count(),
    prisma.collectionActivity.count(),
  ]);

  console.log('\n📊 Final Record Counts:');
  console.log(`  Users:                  ${uCount}`);
  console.log(`  Customers:              ${cCount}`);
  console.log(`  Loans:                  ${lCount}`);
  console.log(`  Repayments:             ${rCount}`);
  console.log(`  Collection Activities:  ${aCount}`);

  // Agent → customer distribution
  console.log('\n👥 Agent → Customer Distribution:');
  for (const ag of agents) {
    const n = await prisma.customer.count({ where: { assignedAgentId: ag.id } });
    console.log(`  ${ag.name.padEnd(22)} ${n} customers`);
  }

  // Loan status distribution
  console.log('\n📋 Loan Status Distribution:');
  for (const s of LOAN_STATUSES) {
    const n = await prisma.loan.count({ where: { status: s } });
    console.log(`  ${s.padEnd(14)} ${n}`);
  }

  // Financial invariants
  const allLoans = await prisma.loan.findMany({
    select: { id: true, totalAmount: true, amountPaid: true, outstandingBalance: true, status: true },
  });
  let violations = 0;
  for (const l of allLoans) {
    const tot = parseFloat(l.totalAmount.toString());
    const pd  = parseFloat(l.amountPaid.toString());
    const ob  = parseFloat(l.outstandingBalance.toString());
    const expectedOb = r2(tot - pd);

    if (pd < 0 || pd > tot + 0.02) {
      console.error(`  ❌ amountPaid out of range on loan ${l.id} (paid=${pd}, total=${tot})`);
      violations++;
    }
    if (Math.abs(ob - expectedOb) > 0.02) {
      console.error(`  ❌ outstandingBalance mismatch on loan ${l.id} (ob=${ob}, expected=${expectedOb})`);
      violations++;
    }
    if (l.status === 'CLOSED' && ob > 0.02) {
      console.error(`  ❌ CLOSED loan has non-zero outstandingBalance: loan ${l.id} (ob=${ob})`);
      violations++;
    }
  }

  if (violations === 0) {
    console.log('\n✅ All financial invariants passed');
  } else {
    console.log(`\n❌ ${violations} financial invariant violation(s) detected — check errors above`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔑 Demo Login Credentials (password: password123):');
  for (const u of USER_DEFS) {
    const roleLabel = u.role.replace('_', ' ');
    console.log(`  ${u.email.padEnd(26)} ${roleLabel}`);
  }

  console.log('\n✅ Seed complete!\n');
}

// ─── Entry point ──────────────────────────────────────────────────────────────
main()
  .catch((e) => {
    console.error('\nSeed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
