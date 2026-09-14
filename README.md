# Debt Collection Management Platform

A full-stack debt collection operations platform for managing customers, loans, repayments, and collection activities with role-based access control.

Built with React, Node.js, Express, PostgreSQL, Prisma, and JWT authentication.

## 🚀 Live Demo

**Live Application:** [Vercel Deployment](https://debt-collection-management-platform.vercel.app)

**Backend API:** [Render Deployment](https://debt-collection-management-platform.onrender.com/)

**Source Code:** [GitHub Repository](https://github.com/saurabhsunildxb/debt-collection-management-platform)

### Demo Accounts

All demo accounts use:

`password123`

| Role | Email |
|---|---|
| Admin | admin@demo.com |
| Manager | manager@demo.com |
| Collection Agent | agent1@demo.com |
| Collection Agent | agent2@demo.com |

> This application uses seeded demo data and is intended for portfolio/demo purposes.

---

## 📌 Overview

The Debt Collection Management Platform provides a centralized workspace for collection teams to manage customer portfolios, track outstanding loans, record repayments, and maintain collection activity history.

The system implements **role-based access control (RBAC)** so that administrators, managers, and collection agents have different permissions and data visibility.

Collection agents are restricted to customers assigned to them, while administrators and managers have organization-wide access.

---

## ✨ Key Features

### Authentication & Authorization

- JWT-based authentication
- Protected API routes
- Role-based access control
- Three user roles:
  - Admin
  - Manager
  - Collection Agent
- Persistent login sessions
- Role-aware navigation and dashboards

### Customer Management

- Create, view, update, and delete customers
- Assign customers to collection agents
- Search and paginate customer records
- Customer portfolio overview
- Customer-level loan and repayment history
- Agent-specific customer visibility

### Loan Management

- Create and manage loans
- Track principal and interest
- Automatic total amount calculation
- Track amount paid and outstanding balance
- Loan status management
- Overdue loan tracking
- Repayment progress indicators

### Repayment Management

- Record loan repayments
- Payment date tracking
- Automatic loan balance updates
- Automatic loan status updates when fully paid
- Prevention of invalid/over payments
- Active-loan filtering for payment entry

### Collection Activities

- Log collection activities
- Activity types and outcomes
- Follow-up date tracking
- Activity timeline
- Agent ownership of activities
- Role-based activity editing and deletion

### Dashboard & Analytics

- Total customers
- Active loans
- Total collections
- Outstanding balance
- Overdue amount
- Collection rate
- Monthly collection trends
- Loan status breakdown
- Agent performance
- Recent collection activities

### Role-Based Data Scoping

Collection agents only see data belonging to their assigned customer portfolio.

For example:

```text
Agent
  ↓
Assigned Customers
  ↓
Customer Loans
  ↓
Loan Repayments
  ↓
Collection Activities
