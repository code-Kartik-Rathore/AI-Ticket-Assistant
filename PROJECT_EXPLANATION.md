# 🎓 Complete Project Explanation - AI Ticket Management System

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Database Schema](#database-schema)
4. [Complete User Flow](#complete-user-flow)
5. [Authentication System](#authentication-system)
6. [Ticket Creation & Processing Flow](#ticket-creation--processing-flow)
7. [AI Integration Deep Dive](#ai-integration-deep-dive)
8. [Moderator Assignment Algorithm](#moderator-assignment-algorithm)
9. [Frontend Architecture](#frontend-architecture)
10. [API Endpoints Explained](#api-endpoints-explained)
11. [Inngest Background Jobs](#inngest-background-jobs)
12. [Key Design Decisions](#key-design-decisions)
---

## 🎯 Project Overview

**What is this project?**
An AI-powered ticket management system that automatically processes support tickets, categorizes them, assigns priorities, and routes them to the most appropriate moderators based on their skills.

**Core Problem It Solves:**
- Manual ticket triage is time-consuming
- Matching tickets to the right person requires domain knowledge
- Prioritization is subjective
- **Solution:** AI automatically analyzes tickets and assigns them intelligently

---

## 🏗️ Architecture & Tech Stack

### **Backend Stack:**
- **Runtime:** Node.js with Express.js (v5.1.0)
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens) with bcrypt for password hashing
- **Background Jobs:** Inngest (event-driven architecture)
- **AI:** Google Gemini 2.0 Flash Lite via @inngest/agent-kit
- **Email:** Nodemailer with Mailtrap (for testing)

### **Frontend Stack:**
- **Framework:** React 19 with Vite
- **Routing:** React Router DOM v7
- **Styling:** Tailwind CSS + DaisyUI components
- **State Management:** React Hooks (useState, useEffect)

### **Project Structure:**
```
ai-ticket-system/
├── ai-ticket-assistant/     # Backend (Express API)
│   ├── controllers/         # Business logic
│   ├── models/              # MongoDB schemas
│   ├── routes/              # API route definitions
│   ├── middlewares/         # Auth middleware
│   ├── utils/               # AI & Email utilities
│   └── inngest/             # Background job functions
└── ai-ticket-frontend/      # Frontend (React)
    └── src/
        ├── pages/           # Route components
        └── components/      # Reusable components
```

---

## 💾 Database Schema

### **User Model** (`models/user.js`)
```javascript
{
  email: String (required, unique),
  password: String (hashed with bcrypt),
  role: String (enum: ["user", "moderator", "admin"], default: "user"),
  skills: [String],  // Array of skills (e.g., ["React", "Node.js", "Python"])
  createdAt: Date
}
```

**Key Points:**
- Passwords are hashed using bcrypt with salt rounds of 10
- Roles: `user` (default), `moderator` (handles tickets), `admin` (manages users)
- Skills array is used for matching moderators to tickets

### **Ticket Model** (`models/ticket.js`)
```javascript
{
  title: String,
  description: String,
  status: String (default: "TODO", can be "IN_PROGRESS", "DONE"),
  createdBy: ObjectId (ref: User),
  assignedTo: ObjectId (ref: User, nullable),
  priority: String ("low", "medium", "high"),
  deadline: Date (optional),
  helpfulNotes: String (AI-generated),
  relatedSkills: [String] (AI-generated),
  createdAt: Date
}
```

**Key Points:**
- `createdBy` links to the user who created the ticket
- `assignedTo` is set by AI processing (can be null initially)
- `relatedSkills` and `helpfulNotes` are populated by AI analysis

---

## 🔄 Complete User Flow

### **1. User Registration Flow**

**Frontend (`signup.jsx`):**
1. User enters email and password
2. Form submits to `POST /api/auth/signup`
3. On success: token & user saved to localStorage, redirect to home

**Backend (`controllers/user.js` - `signup` function):**
1. **Validation:** Checks email/password exist, password ≥ 6 chars
2. **Duplicate Check:** Queries MongoDB for existing email
3. **Password Hashing:** Uses bcrypt.hash(password, 10)
4. **User Creation:** Saves to MongoDB with default role "user"
5. **Inngest Event:** Sends `user/signup` event (non-blocking - won't fail signup if Inngest is down)
6. **JWT Generation:** Creates token with `{ _id, role }` payload
7. **Response:** Returns `{ user, token }`

**Inngest Function (`on-signup.js`):**
- Listens for `user/signup` event
- Fetches user from DB (step 1)
- Sends welcome email (step 2)
- Uses Inngest's step.run() for retry logic

---

### **2. User Login Flow**

**Frontend (`login.jsx`):**
1. User enters email/password
2. POST to `/api/auth/login`
3. On success: save token & user, redirect to home

**Backend (`controllers/user.js` - `login` function):**
1. Find user by email in MongoDB
2. Compare password using `bcrypt.compare(password, user.password)`
3. If match: generate JWT token
4. Return `{ user, token }`

---

### **3. Ticket Creation Flow** (THE CORE FLOW)

**Frontend (`tickets.jsx`):**
1. User fills form: title + description
2. POST to `/api/tickets` with JWT token in Authorization header
3. On success: form clears, ticket list refreshes

**Backend (`controllers/ticket.js` - `createTicket`):**
1. **Auth Check:** `authenticate` middleware verifies JWT token
2. **Validation:** Checks title & description exist
3. **Create Ticket:** Saves to MongoDB with:
   - `title`, `description`
   - `createdBy: req.user._id` (from JWT)
   - `status: "TODO"` (default)
4. **Trigger Inngest:** Sends `ticket/created` event with ticketId
5. **Response:** Returns 201 with ticket object

**Why Inngest?** Ticket creation is fast (synchronous), but AI processing takes time. Inngest handles it asynchronously so the API responds immediately.

---

### **4. AI Processing Flow** (Background Job)

**Inngest Function (`on-ticket-create.js`):**

**Step 1: Fetch Ticket**
```javascript
step.run("fetch-ticket", async () => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw NonRetriableError("Ticket not found");
  return ticket;
});
```

**Step 2: Update Status**
- Sets status to "TODO" (explicit update)

**Step 3: AI Analysis** (`utils/ai.js`)
- Calls `analyzeTicket(ticket)` function
- Uses Google Gemini 2.0 Flash Lite model
- **AI Prompt:** Analyzes title + description, returns JSON:
  ```json
  {
    "summary": "Short summary",
    "priority": "high|medium|low",
    "helpfulNotes": "Tips for moderator...",
    "relatedSkills": ["React", "Node.js"]
  }
  ```
- **Response Parsing:** Strips markdown code fences, parses JSON
- **Error Handling:** Returns null if AI fails, falls back gracefully

**Step 4: Update Ticket with AI Data**
```javascript
step.run("ai-processing", async () => {
  await Ticket.findByIdAndUpdate(ticket._id, {
    priority: aiResponse.priority || "medium",
    helpfulNotes: aiResponse.helpfulNotes,
    status: "IN_PROGRESS",
    relatedSkills: aiResponse.relatedSkills
  });
  return aiResponse.relatedSkills;
});
```

**Step 5: Assign Moderator**
```javascript
step.run("assign-moderator", async () => {
  // Try to find moderator with matching skills
  let user = await User.findOne({
    role: "moderator",
    skills: {
      $elemMatch: {
        $regex: relatedSkills.join("|"),  // Regex: "React|Node.js|Python"
        $options: "i"  // Case-insensitive
      }
    }
  });
  
  // Fallback to admin if no match
  if (!user) {
    user = await User.findOne({ role: "admin" });
  }
  
  // Assign ticket
  await Ticket.findByIdAndUpdate(ticket._id, {
    assignedTo: user?._id || null
  });
  
  return user;
});
```

**Step 6: Send Email Notification**
- Emails assigned moderator with ticket details
- Uses Nodemailer + Mailtrap SMTP

---

## 🤖 AI Integration Deep Dive

### **How It Works:**

**File:** `utils/ai.js`

```javascript
import { createAgent, gemini } from "@inngest/agent-kit";

const analyzeTicket = async (ticket) => {
  const supportAgent = createAgent({
    model: gemini({
      model: "gemini-2.0-flash-lite",
      apiKey: process.env.GEMINI_API_KEY
    }),
    name: "AI Ticket Triage Assistant",
    system: `You are an expert AI assistant that processes technical support tickets.
    Your job is to:
    1. Summarize the issue.
    2. Estimate its priority.
    3. Provide helpful notes and resource links for human moderators.
    4. List relevant technical skills required.
    
    IMPORTANT: Respond ONLY with valid raw JSON.`
  });

  const response = await supportAgent.run(`
    Analyze this support ticket and return ONLY a JSON object:
    {
      "summary": "Short summary of the ticket",
      "priority": "high",
      "helpfulNotes": "Here are useful tips...",
      "relatedSkills": ["React", "Node.js"]
    }
    
    Ticket:
    - Title: ${ticket.title}
    - Description: ${ticket.description}
  `);
  
  // Parse and return JSON
};
```

**Key Points:**
- Uses `@inngest/agent-kit` for structured AI interactions
- System prompt defines the AI's role
- User prompt includes ticket data
- Response is cleaned (removes markdown) and parsed as JSON
- Returns null on failure (graceful degradation)

---

## 🎯 Moderator Assignment Algorithm

**Location:** `inngest/functions/on-ticket-create.js` - Step 5

**Algorithm:**
1. **Get AI-generated skills** from ticket (e.g., ["React", "Node.js"])
2. **Build regex pattern:** `"React|Node.js|Python"` (OR logic)
3. **Query MongoDB:**
   ```javascript
   User.findOne({
     role: "moderator",
     skills: {
       $elemMatch: {
         $regex: "React|Node.js",  // Matches if ANY skill matches
         $options: "i"  // Case-insensitive
       }
     }
   })
   ```
4. **Fallback Logic:**
   - If no moderator matches → assign to admin
   - If no admin exists → assignedTo remains null

**Why Regex?** Allows partial matching. If ticket needs "React" and moderator has "React.js", it still matches.

---

## 🎨 Frontend Architecture

### **Routing** (`main.jsx`):
- `/` → Tickets list (protected)
- `/tickets/:id` → Ticket details (protected)
- `/api/login` → Login page (public, redirects if logged in)
- `/api/signup` → Signup page (public)
- `/api/admin` → Admin panel (protected, admin only)

### **Components:**

**1. CheckAuth (`components/check-auth.jsx`):**
- **Purpose:** Route protection
- **Logic:**
  - If `protectedRoute={true}` and no token → redirect to `/api/login`
  - If `protectedRoute={false}` and token exists → redirect to `/`
- **Usage:** Wraps routes that need authentication

**2. Navbar (`components/navbar.jsx`):**
- Shows login/signup if not authenticated
- Shows user email + logout if authenticated
- Shows "Admin" link if user role is "admin"

**3. Tickets Page (`pages/tickets.jsx`):**
- **Form:** Create new ticket (title + description)
- **List:** Shows all tickets (filtered by role)
  - Regular users: Only see their own tickets
  - Moderators/Admins: See all tickets
- **Fetching:** GET `/api/tickets` with JWT token

**4. Ticket Details (`pages/ticket.jsx`):**
- Fetches single ticket: GET `/api/tickets/:id`
- Shows full details including:
  - AI-generated priority, skills, helpful notes
  - Assigned moderator
  - Status
- Uses ReactMarkdown to render helpfulNotes

**5. Admin Panel (`pages/admin.jsx`):**
- Lists all users (GET `/api/auth/users`)
- Search functionality (filters by email)
- Edit user: Update role and skills
- POST `/api/auth/update-user` to save changes

---

## 🔌 API Endpoints Explained

### **Authentication Routes** (`/api/auth`)

**POST `/api/auth/signup`**
- **Public:** Yes
- **Body:** `{ email, password, skills? }`
- **Response:** `{ user, token }`
- **Process:** Validates, hashes password, creates user, sends Inngest event, returns JWT

**POST `/api/auth/login`**
- **Public:** Yes
- **Body:** `{ email, password }`
- **Response:** `{ user, token }`
- **Process:** Finds user, compares password, returns JWT

**POST `/api/auth/logout`**
- **Protected:** Yes (but doesn't do much - just validates token)
- **Note:** Frontend handles logout by clearing localStorage

**GET `/api/auth/users`**
- **Protected:** Yes, Admin only
- **Response:** Array of users (passwords excluded)
- **Process:** Checks `req.user.role === "admin"`, returns all users

**POST `/api/auth/update-user`**
- **Protected:** Yes, Admin only
- **Body:** `{ email, role, skills }`
- **Response:** `{ message: "User updated successfully" }`
- **Process:** Admin can change user roles and skills

### **Ticket Routes** (`/api/tickets`)

**POST `/api/tickets`**
- **Protected:** Yes
- **Body:** `{ title, description }`
- **Response:** `{ message, ticket }`
- **Process:** Creates ticket, triggers Inngest event

**GET `/api/tickets`**
- **Protected:** Yes
- **Response:** Array of tickets
- **Logic:**
  - If `user.role === "user"`: Only their tickets
  - If `user.role !== "user"`: All tickets with populated `assignedTo`

**GET `/api/tickets/:id`**
- **Protected:** Yes
- **Response:** `{ ticket }`
- **Logic:**
  - Regular users: Can only see their own tickets
  - Moderators/Admins: Can see any ticket

---

## ⚙️ Inngest Background Jobs

### **What is Inngest?**
A platform for running background jobs (like AWS Lambda, but simpler). It handles:
- Event-driven workflows
- Retries on failure
- Step-by-step execution with visibility

### **Inngest Setup:**

**1. Client** (`inngest/client.js`):
```javascript
export const inngest = new Inngest({ id: "ticketing-system" });
```

**2. Router** (`inngest/index.js`):
- Mounts Inngest endpoint at `/api/inngest`
- Registers functions: `onUserSignup`, `onTicketCreated`

**3. Functions:**

**`onUserSignup`:**
- **Trigger:** `user/signup` event
- **Steps:**
  1. Fetch user from DB
  2. Send welcome email
- **Retries:** 2 attempts

**`onTicketCreated`:**
- **Trigger:** `ticket/created` event
- **Steps:**
  1. Fetch ticket
  2. Update status to "TODO"
  3. AI analysis
  4. Update ticket with AI data
  5. Assign moderator
  6. Send email notification
- **Retries:** 2 attempts

### **Why Use Steps?**
Each `step.run()` is:
- **Idempotent:** Can retry safely
- **Trackable:** Visible in Inngest dashboard
- **Isolated:** If step 3 fails, steps 1-2 already completed

---

## 🔐 Authentication Middleware

**File:** `middlewares/auth.js`

```javascript
export const authenticate = (req, res, next) => {
  // Extract token from: "Bearer <token>"
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ error: "Access Denied. No token found." });
  }
  
  try {
    // Verify token and decode payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user info to request
    req.user = decoded;  // { _id, role }
    next();  // Continue to route handler
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};
```

**Usage:** Applied to routes that need authentication:
```javascript
router.post("/", authenticate, createTicket);
```

---

## 🎯 Key Design Decisions

### **1. Why Inngest Instead of Direct AI Call?**
- **Performance:** API responds immediately (200ms) vs waiting for AI (5-10s)
- **Reliability:** If AI fails, ticket still created
- **Scalability:** Can process multiple tickets concurrently
- **Observability:** See job status in Inngest dashboard

### **2. Why Regex for Skill Matching?**
- Flexible: "React" matches "React.js", "React Native"
- Case-insensitive: "react" matches "React"
- Simple: No complex NLP needed

### **3. Why Fallback to Admin?**
- Ensures every ticket gets assigned
- Admin can manually reassign if needed
- Better than leaving tickets unassigned

### **4. Why Separate Frontend/Backend?**
- **Separation of Concerns:** UI logic separate from business logic
- **Scalability:** Can scale frontend/backend independently
- **Technology Choice:** React for UI, Node.js for API

### **5. Why JWT Instead of Sessions?**
- **Stateless:** No server-side session storage
- **Scalable:** Works across multiple servers
- **Simple:** Token contains user info (no DB lookup needed)

---

## 🚀 How to Explain This in an Interview

### **Elevator Pitch (30 seconds):**
"This is an AI-powered ticket management system. Users create support tickets, and AI automatically analyzes them to determine priority, required skills, and assigns them to the best-matched moderator. It uses an event-driven architecture with Inngest for background processing, ensuring fast API responses while AI processing happens asynchronously."

### **Technical Highlights:**
1. **Event-Driven Architecture:** Inngest handles async AI processing
2. **AI Integration:** Google Gemini analyzes tickets and extracts structured data
3. **Smart Matching:** Regex-based skill matching for moderator assignment
4. **Role-Based Access:** JWT authentication with user/moderator/admin roles
5. **Graceful Degradation:** System works even if AI or Inngest fails

### **If Asked About Challenges:**
- **AI Response Parsing:** Had to handle markdown code fences and invalid JSON
- **Skill Matching:** Used regex for flexible matching
- **Error Handling:** Made Inngest events non-blocking so signup works even if email fails

### **If Asked About Improvements:**
- Add ticket status updates (mark as resolved)
- Add comments/threading to tickets
- Real-time notifications (WebSockets)
- More sophisticated AI prompts for better categorization
- Analytics dashboard for ticket metrics

---

## 📝 Environment Variables Needed

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/ticket-system

# JWT Secret (any random string)
JWT_SECRET=your-super-secret-key-here

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Mailtrap (for email testing)
MAILTRAP_SMTP_HOST=smtp.mailtrap.io
MAILTRAP_SMTP_PORT=2525
MAILTRAP_SMTP_USER=your-mailtrap-user
MAILTRAP_SMTP_PASS=your-mailtrap-password

# Frontend
VITE_SERVER_URL=http://localhost:3000
```

---

## 🎓 Summary - Key Takeaways

1. **Architecture:** RESTful API (Express) + React SPA + MongoDB
2. **AI:** Google Gemini analyzes tickets asynchronously via Inngest
3. **Matching:** Regex-based skill matching assigns tickets to moderators
4. **Auth:** JWT tokens with role-based access control
5. **Background Jobs:** Inngest handles email sending and AI processing
6. **Error Handling:** Graceful degradation - system works even if AI/Inngest fails

**The Flow in One Sentence:**
User creates ticket → API saves it → Inngest triggers → AI analyzes → Moderator assigned → Email sent → Ticket updated in DB.

---

**You're now ready to explain this project confidently! 🚀**
