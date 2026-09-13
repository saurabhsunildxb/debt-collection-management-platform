// server/prisma/seed.js
// Run with: npm run db:seed

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Clean existing data (order matters for FK constraints) ────────────────
  await prisma.collectionActivity.deleteMany();
  await prisma.repayment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  console.log('  ✓ Cleared existing data');

  const SALT_ROUNDS = 10;
  const DEFAULT_PASSWORD = await bcrypt.hash('password123', SALT_ROUNDS);

  // ─── Users ─────────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@demo.com',
      password: DEFAULT_PASSWORD,
      role: 'ADMIN',
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Sarah Manager',
      email: 'manager@demo.com',
      password: DEFAULT_PASSWORD,
      role: 'MANAGER',
    },
  });

  const agent1 = await prisma.user.create({
    data: {
      name: 'James Carter',
      email: 'agent1@demo.com',
      password: DEFAULT_PASSWORD,
      role: 'COLLECTION_AGENT',
    },
  });

  const agent2 = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'agent2@demo.com',
      password: DEFAULT_PASSWORD,
      role: 'COLLECTION_AGENT',
    },
  });

  console.log('  ✓ Created 4 users (1 Admin, 1 Manager, 2 Agents)');

  // ─── Customers ─────────────────────────────────────────────────────────────
  const customersData = [
    // Assigned to agent1
    {
      fullName: 'Michael Johnson',
      email: 'mjohnson@email.com',
      phone: '+1-555-0101',
      address: '123 Oak Street, Chicago, IL 60601',
      nationalId: 'IL-MJ-001',
      assignedAgentId: agent1.id,
    },
    {
      fullName: 'Angela Williams',
      email: 'awilliams@email.com',
      phone: '+1-555-0102',
      address: '456 Maple Ave, Chicago, IL 60602',
      nationalId: 'IL-AW-002',
      assignedAgentId: agent1.id,
    },
    {
      fullName: 'Robert Davis',
      email: 'rdavis@email.com',
      phone: '+1-555-0103',
      address: '789 Pine Rd, Evanston, IL 60201',
      nationalId: 'IL-RD-003',
      assignedAgentId: agent1.id,
    },
    {
      fullName: 'Linda Martinez',
      email: 'lmartinez@email.com',
      phone: '+1-555-0104',
      address: '321 Elm Blvd, Naperville, IL 60540',
      nationalId: 'IL-LM-004',
      assignedAgentId: agent1.id,
    },
    {
      fullName: 'James Thompson',
      email: 'jthompson@email.com',
      phone: '+1-555-0105',
      address: '654 Cedar Ln, Aurora, IL 60505',
      nationalId: 'IL-JT-005',
      assignedAgentId: agent1.id,
    },
    // Assigned to agent2
    {
      fullName: 'Patricia Wilson',
      email: 'pwilson@email.com',
      phone: '+1-555-0106',
      address: '987 Birch Dr, Rockford, IL 61101',
      nationalId: 'IL-PW-006',
      assignedAgentId: agent2.id,
    },
    {
      fullName: 'Christopher Moore',
      email: 'cmoore@email.com',
      phone: '+1-555-0107',
      address: '147 Walnut St, Peoria, IL 61602',
      nationalId: 'IL-CM-007',
      assignedAgentId: agent2.id,
    },
    {
      fullName: 'Barbara Taylor',
      email: 'btaylor@email.com',
      phone: '+1-555-0108',
      address: '258 Spruce Ave, Springfield, IL 62701',
      nationalId: 'IL-BT-008',
      assignedAgentId: agent2.id,
    },
    {
      fullName: 'Daniel Anderson',
      email: 'danderson@email.com',
      phone: '+1-555-0109',
      address: '369 Willow Ct, Champaign, IL 61820',
      nationalId: 'IL-DA-009',
      assignedAgentId: agent2.id,
    },
    {
      fullName: 'Susan Jackson',
      email: 'sjackson@email.com',
      phone: '+1-555-0110',
      address: '741 Poplar Way, Bloomington, IL 61701',
      nationalId: 'IL-SJ-010',
      assignedAgentId: agent2.id,
    },
  ];

  const customers = await Promise.all(
    customersData.map((c) => prisma.customer.create({ data: c }))
  );
  console.log('  ✓ Created 10 customers (5 per agent)');

  // ─── Loans ─────────────────────────────────────────────────────────────────
  const now = new Date();
  const daysAgo = (d) => new Date(now - d * 86400000);
  const daysAhead = (d) => new Date(now.getTime() + d * 86400000);

  const loansData = [
    // Michael Johnson — 2 loans
    {
      customerId: customers[0].id,
      principalAmount: 15000,
      interestRate: 12.5,
      totalAmount: 16875,
      amountPaid: 5000,
      outstandingBalance: 11875,
      dueDate: daysAhead(45),
      status: 'ACTIVE',
    },
    {
      customerId: customers[0].id,
      principalAmount: 5000,
      interestRate: 10.0,
      totalAmount: 5500,
      amountPaid: 5500,
      outstandingBalance: 0,
      dueDate: daysAgo(30),
      status: 'CLOSED',
    },
    // Angela Williams — 1 loan (OVERDUE)
    {
      customerId: customers[1].id,
      principalAmount: 8000,
      interestRate: 15.0,
      totalAmount: 9200,
      amountPaid: 2000,
      outstandingBalance: 7200,
      dueDate: daysAgo(15),
      status: 'OVERDUE',
    },
    // Robert Davis — 1 loan (ACTIVE)
    {
      customerId: customers[2].id,
      principalAmount: 20000,
      interestRate: 11.0,
      totalAmount: 22200,
      amountPaid: 8000,
      outstandingBalance: 14200,
      dueDate: daysAhead(90),
      status: 'ACTIVE',
    },
    // Linda Martinez — 1 loan (DEFAULTED)
    {
      customerId: customers[3].id,
      principalAmount: 12000,
      interestRate: 18.0,
      totalAmount: 14160,
      amountPaid: 3000,
      outstandingBalance: 11160,
      dueDate: daysAgo(60),
      status: 'DEFAULTED',
    },
    // James Thompson — 1 loan (OVERDUE)
    {
      customerId: customers[4].id,
      principalAmount: 7500,
      interestRate: 13.0,
      totalAmount: 8475,
      amountPaid: 1000,
      outstandingBalance: 7475,
      dueDate: daysAgo(10),
      status: 'OVERDUE',
    },
    // Patricia Wilson — 2 loans
    {
      customerId: customers[5].id,
      principalAmount: 25000,
      interestRate: 9.5,
      totalAmount: 27375,
      amountPaid: 10000,
      outstandingBalance: 17375,
      dueDate: daysAhead(120),
      status: 'ACTIVE',
    },
    {
      customerId: customers[5].id,
      principalAmount: 3000,
      interestRate: 10.0,
      totalAmount: 3300,
      amountPaid: 3300,
      outstandingBalance: 0,
      dueDate: daysAgo(90),
      status: 'CLOSED',
    },
    // Christopher Moore — 1 loan (ACTIVE)
    {
      customerId: customers[6].id,
      principalAmount: 18000,
      interestRate: 12.0,
      totalAmount: 20160,
      amountPaid: 6000,
      outstandingBalance: 14160,
      dueDate: daysAhead(60),
      status: 'ACTIVE',
    },
    // Barbara Taylor — 1 loan (OVERDUE)
    {
      customerId: customers[7].id,
      principalAmount: 9500,
      interestRate: 14.0,
      totalAmount: 10830,
      amountPaid: 2500,
      outstandingBalance: 8330,
      dueDate: daysAgo(20),
      status: 'OVERDUE',
    },
    // Daniel Anderson — 1 loan (ACTIVE)
    {
      customerId: customers[8].id,
      principalAmount: 30000,
      interestRate: 10.5,
      totalAmount: 33150,
      amountPaid: 15000,
      outstandingBalance: 18150,
      dueDate: daysAhead(180),
      status: 'ACTIVE',
    },
    // Susan Jackson — 1 loan (DEFAULTED)
    {
      customerId: customers[9].id,
      principalAmount: 6000,
      interestRate: 20.0,
      totalAmount: 7200,
      amountPaid: 500,
      outstandingBalance: 6700,
      dueDate: daysAgo(75),
      status: 'DEFAULTED',
    },
  ];

  const loans = await Promise.all(
    loansData.map((l) =>
      prisma.loan.create({
        data: {
          ...l,
          principalAmount: l.principalAmount,
          interestRate: l.interestRate,
          totalAmount: l.totalAmount,
          amountPaid: l.amountPaid,
          outstandingBalance: l.outstandingBalance,
        },
      })
    )
  );
  console.log('  ✓ Created 12 loans');

  // ─── Repayments ────────────────────────────────────────────────────────────
  const repaymentsData = [
    // Michael Johnson — Loan 0 repayments
    { loanId: loans[0].id, amount: 2000, paymentDate: daysAgo(60), notes: 'First installment' },
    { loanId: loans[0].id, amount: 2000, paymentDate: daysAgo(30), notes: 'Second installment' },
    { loanId: loans[0].id, amount: 1000, paymentDate: daysAgo(5), notes: 'Partial payment' },
    // Michael Johnson — Loan 1 (closed)
    { loanId: loans[1].id, amount: 2000, paymentDate: daysAgo(120), notes: 'Payment 1' },
    { loanId: loans[1].id, amount: 3500, paymentDate: daysAgo(90), notes: 'Final settlement' },
    // Angela Williams — Loan 2 (overdue)
    { loanId: loans[2].id, amount: 2000, paymentDate: daysAgo(45), notes: 'Collected via call' },
    // Robert Davis — Loan 3
    { loanId: loans[3].id, amount: 4000, paymentDate: daysAgo(75), notes: 'Monthly payment' },
    { loanId: loans[3].id, amount: 4000, paymentDate: daysAgo(45), notes: 'Monthly payment' },
    // Linda Martinez — Loan 4
    { loanId: loans[4].id, amount: 3000, paymentDate: daysAgo(100), notes: 'Partial recovery' },
    // James Thompson — Loan 5
    { loanId: loans[5].id, amount: 1000, paymentDate: daysAgo(40), notes: 'Collected after visit' },
    // Patricia Wilson — Loan 6
    { loanId: loans[6].id, amount: 5000, paymentDate: daysAgo(80), notes: 'First payment' },
    { loanId: loans[6].id, amount: 5000, paymentDate: daysAgo(50), notes: 'Second payment' },
    // Patricia Wilson — Loan 7 (closed)
    { loanId: loans[7].id, amount: 1500, paymentDate: daysAgo(150), notes: 'Payment 1' },
    { loanId: loans[7].id, amount: 1800, paymentDate: daysAgo(120), notes: 'Final payment' },
    // Christopher Moore — Loan 8
    { loanId: loans[8].id, amount: 3000, paymentDate: daysAgo(55), notes: 'Monthly EMI' },
    { loanId: loans[8].id, amount: 3000, paymentDate: daysAgo(25), notes: 'Monthly EMI' },
    // Barbara Taylor — Loan 9
    { loanId: loans[9].id, amount: 2500, paymentDate: daysAgo(35), notes: 'Collected after SMS reminder' },
    // Daniel Anderson — Loan 10
    { loanId: loans[10].id, amount: 7500, paymentDate: daysAgo(70), notes: 'Quarterly payment' },
    { loanId: loans[10].id, amount: 7500, paymentDate: daysAgo(10), notes: 'Quarterly payment' },
    // Susan Jackson — Loan 11
    { loanId: loans[11].id, amount: 500, paymentDate: daysAgo(50), notes: 'Token payment' },
  ];

  await Promise.all(
    repaymentsData.map((r) => prisma.repayment.create({ data: r }))
  );
  console.log('  ✓ Created 20 repayments');

  // ─── Collection Activities ─────────────────────────────────────────────────
  const activitiesData = [
    // Agent1 activities
    { agentId: agent1.id, customerId: customers[0].id, activityType: 'CALL', outcome: 'CONTACTED', notes: 'Customer confirmed next payment on Friday', followUpDate: daysAhead(3), createdAt: daysAgo(5) },
    { agentId: agent1.id, customerId: customers[0].id, activityType: 'EMAIL', outcome: 'CONTACTED', notes: 'Sent payment reminder email', createdAt: daysAgo(15) },
    { agentId: agent1.id, customerId: customers[1].id, activityType: 'CALL', outcome: 'NO_ANSWER', notes: 'No answer, left voicemail', followUpDate: daysAhead(1), createdAt: daysAgo(3) },
    { agentId: agent1.id, customerId: customers[1].id, activityType: 'CALL', outcome: 'PROMISE_TO_PAY', notes: 'Customer promised to pay $2000 by end of week', followUpDate: daysAhead(5), createdAt: daysAgo(8) },
    { agentId: agent1.id, customerId: customers[1].id, activityType: 'SMS', outcome: 'CONTACTED', notes: 'Sent overdue payment SMS alert', createdAt: daysAgo(1) },
    { agentId: agent1.id, customerId: customers[2].id, activityType: 'CALL', outcome: 'PAID', notes: 'Customer made payment of $4000 over phone', createdAt: daysAgo(45) },
    { agentId: agent1.id, customerId: customers[2].id, activityType: 'PAYMENT_REMINDER', outcome: 'CONTACTED', notes: 'Monthly reminder sent', createdAt: daysAgo(30) },
    { agentId: agent1.id, customerId: customers[3].id, activityType: 'VISIT', outcome: 'REFUSED', notes: 'Customer refused to pay, escalating to manager', createdAt: daysAgo(20) },
    { agentId: agent1.id, customerId: customers[3].id, activityType: 'CALL', outcome: 'NO_ANSWER', notes: 'Phone disconnected', createdAt: daysAgo(10) },
    { agentId: agent1.id, customerId: customers[4].id, activityType: 'VISIT', outcome: 'PROMISE_TO_PAY', notes: 'Home visit — customer agreed to pay $1000 this week', followUpDate: daysAhead(7), createdAt: daysAgo(7) },
    { agentId: agent1.id, customerId: customers[4].id, activityType: 'CALL', outcome: 'LEFT_MESSAGE', notes: 'Left message with family member', createdAt: daysAgo(2) },
    // Agent2 activities
    { agentId: agent2.id, customerId: customers[5].id, activityType: 'CALL', outcome: 'CONTACTED', notes: 'Discussed repayment schedule, customer cooperative', createdAt: daysAgo(10) },
    { agentId: agent2.id, customerId: customers[5].id, activityType: 'EMAIL', outcome: 'CONTACTED', notes: 'Sent updated loan statement', createdAt: daysAgo(25) },
    { agentId: agent2.id, customerId: customers[6].id, activityType: 'CALL', outcome: 'PAID', notes: 'Customer made EMI payment $3000', createdAt: daysAgo(25) },
    { agentId: agent2.id, customerId: customers[6].id, activityType: 'PAYMENT_REMINDER', outcome: 'CONTACTED', notes: 'Upcoming due date reminder', followUpDate: daysAhead(14), createdAt: daysAgo(14) },
    { agentId: agent2.id, customerId: customers[7].id, activityType: 'SMS', outcome: 'CONTACTED', notes: 'Overdue notice sent via SMS', createdAt: daysAgo(5) },
    { agentId: agent2.id, customerId: customers[7].id, activityType: 'CALL', outcome: 'PROMISE_TO_PAY', notes: 'Customer promised partial payment of $1500 next week', followUpDate: daysAhead(7), createdAt: daysAgo(3) },
    { agentId: agent2.id, customerId: customers[8].id, activityType: 'CALL', outcome: 'CONTACTED', notes: 'Regular check-in call, on track', createdAt: daysAgo(20) },
    { agentId: agent2.id, customerId: customers[8].id, activityType: 'EMAIL', outcome: 'CONTACTED', notes: 'Sent quarterly account summary', createdAt: daysAgo(12) },
    { agentId: agent2.id, customerId: customers[9].id, activityType: 'VISIT', outcome: 'REFUSED', notes: 'Customer unavailable, neighbor confirmed address', createdAt: daysAgo(15) },
    { agentId: agent2.id, customerId: customers[9].id, activityType: 'CALL', outcome: 'NO_ANSWER', notes: 'Multiple attempts, no response', createdAt: daysAgo(8) },
    { agentId: agent2.id, customerId: customers[9].id, activityType: 'CALL', outcome: 'LEFT_MESSAGE', notes: 'Left message requesting callback', followUpDate: daysAhead(2), createdAt: daysAgo(2) },
    // Manager activities (can log for any customer)
    { agentId: manager.id, customerId: customers[3].id, activityType: 'CALL', outcome: 'CONTACTED', notes: 'Manager follow-up on escalation from agent', createdAt: daysAgo(18) },
    { agentId: manager.id, customerId: customers[9].id, activityType: 'VISIT', outcome: 'CONTACTED', notes: 'Manager field visit, established payment plan', followUpDate: daysAhead(30), createdAt: daysAgo(6) },
    { agentId: admin.id, customerId: customers[4].id, activityType: 'CALL', outcome: 'CONTACTED', notes: 'Admin review call for OVERDUE account', createdAt: daysAgo(4) },
  ];

  await Promise.all(
    activitiesData.map((a) =>
      prisma.collectionActivity.create({ data: a })
    )
  );
  console.log('  ✓ Created 25 collection activities');

  console.log('\n✅ Seeding complete!');
  console.log('\n📋 Demo Accounts:');
  console.log('  admin@demo.com    | password123 | ADMIN');
  console.log('  manager@demo.com  | password123 | MANAGER');
  console.log('  agent1@demo.com   | password123 | COLLECTION_AGENT (5 customers)');
  console.log('  agent2@demo.com   | password123 | COLLECTION_AGENT (5 customers)');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
