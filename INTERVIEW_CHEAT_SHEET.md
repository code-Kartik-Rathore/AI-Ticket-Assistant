# 🎯 Interview Cheat Sheet - Quick Reference

## 🚀 30-Second Elevator Pitch
"AI-powered ticket management system that automatically analyzes support tickets using Google Gemini, determines priority and required skills, then intelligently assigns them to moderators based on skill matching. Built with Express.js, React, MongoDB, and Inngest for event-driven background processing."

---

## 📊 Tech Stack (One-Liners)

| Component | Technology | Why? |
|-----------|-----------|------|
| Backend | Express.js v5 | RESTful API, fast, simple |
| Database | MongoDB + Mongoose | Flexible schema for tickets/users |
| Auth | JWT + bcrypt | Stateless, scalable |
| Background Jobs | Inngest | Event-driven, retries, observability |
| AI | Google Gemini 2.0 Flash Lite | Fast, structured responses |
| Email | Nodemailer + Mailtrap | Testing-friendly SMTP |
| Frontend | React 19 + Vite | Modern, fast dev experience |
| Styling | Tailwind CSS + DaisyUI | Rapid UI development |

---

## 🔄 Complete Flow (Step-by-Step)

### **Ticket Creation Flow:**
1. User submits form → Frontend sends POST `/api/tickets`
2. Auth middleware verifies JWT token
3. Controller validates title/description
4. Ticket saved to MongoDB (status: "TODO")
5. Inngest event `ticket/created` fired (non-blocking)
6. API returns 201 immediately
7. **Background:** Inngest function triggers
8. **Step 1:** Fetch ticket from DB
9. **Step 2:** Update status to "TODO"
10. **Step 3:** AI analyzes ticket (Gemini API)
11. **Step 4:** Update ticket with AI data (priority, skills, notes)
12. **Step 5:** Find moderator with matching skills (regex)
13. **Step 6:** Assign ticket, send email notification

---

## 🗄️ Database Models

### **User:**
- `email` (unique), `password` (hashed), `role` (user/moderator/admin), `skills` (array)

### **Ticket:**
- `title`, `description`, `status`, `createdBy`, `assignedTo`, `priority`, `helpfulNotes`, `relatedSkills`

---

## 🔐 Authentication Flow

1. **Signup:** Email/password → bcrypt hash → Save user → JWT token → Return
2. **Login:** Email/password → Find user → bcrypt.compare → JWT token → Return
3. **Protected Routes:** Extract token from header → jwt.verify → Attach to req.user → Continue

**JWT Payload:** `{ _id, role }`

---

## 🤖 AI Processing Details

**Model:** Google Gemini 2.0 Flash Lite  
**Library:** @inngest/agent-kit  
**Input:** Ticket title + description  
**Output:** JSON with `priority`, `relatedSkills`, `helpfulNotes`  
**Error Handling:** Returns null if parsing fails, system continues

**Prompt Structure:**
- System prompt: Defines AI role
- User prompt: Ticket data + JSON schema
- Response: Cleaned (remove markdown) → Parse JSON

---

## 🎯 Moderator Assignment Algorithm

```javascript
// 1. Get AI-generated skills from ticket
const skills = ["React", "Node.js"];

// 2. Build regex: "React|Node.js"
const regex = skills.join("|");

// 3. Query: Find moderator with ANY matching skill
User.findOne({
  role: "moderator",
  skills: { $elemMatch: { $regex: regex, $options: "i" } }
});

// 4. Fallback: If no match → assign to admin
```

**Why Regex?** Flexible matching ("React" matches "React.js")

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | No | Register user |
| POST | `/api/auth/login` | No | Login, get JWT |
| GET | `/api/auth/users` | Admin | List all users |
| POST | `/api/auth/update-user` | Admin | Update user role/skills |
| POST | `/api/tickets` | Yes | Create ticket |
| GET | `/api/tickets` | Yes | List tickets (filtered by role) |
| GET | `/api/tickets/:id` | Yes | Get ticket details |

---

## ⚙️ Inngest Functions

### **onUserSignup:**
- **Event:** `user/signup`
- **Steps:** Fetch user → Send welcome email
- **Retries:** 2

### **onTicketCreated:**
- **Event:** `ticket/created`
- **Steps:** Fetch ticket → AI analysis → Update ticket → Assign moderator → Send email
- **Retries:** 2

**Why Steps?** Each step is idempotent, trackable, and can retry independently.

---

## 🎨 Frontend Routes

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/` | Tickets | Yes | List/create tickets |
| `/tickets/:id` | TicketDetails | Yes | View ticket details |
| `/api/login` | Login | No | Login page |
| `/api/signup` | Signup | No | Signup page |
| `/api/admin` | Admin | Admin | User management |

---

## 💡 Key Design Decisions

1. **Inngest for AI Processing:** Fast API response, async AI processing
2. **Regex Skill Matching:** Flexible, simple, no NLP needed
3. **Fallback to Admin:** Ensures every ticket gets assigned
4. **JWT Auth:** Stateless, scalable across servers
5. **Non-blocking Events:** Signup works even if Inngest is down

---

## 🐛 Common Questions & Answers

**Q: What if AI fails?**  
A: System continues, ticket still created, assigned to admin as fallback.

**Q: How do you match skills?**  
A: Regex pattern matching - if ticket needs "React" and moderator has "React.js", it matches.

**Q: Why Inngest instead of direct API call?**  
A: API responds in 200ms vs 5-10s for AI. Better UX, scalable, observable.

**Q: How do you handle duplicate emails?**  
A: MongoDB unique index + explicit check before creation.

**Q: What if no moderator matches?**  
A: Falls back to admin user, ensures ticket is always assigned.

**Q: How is password security handled?**  
A: bcrypt hashing with 10 salt rounds, passwords never stored in plaintext.

---

## 🚀 Deployment Checklist

- [ ] MongoDB connection string
- [ ] JWT_SECRET (random string)
- [ ] GEMINI_API_KEY
- [ ] Mailtrap credentials (or production SMTP)
- [ ] Frontend VITE_SERVER_URL
- [ ] Inngest dev server running (or production Inngest)

---

## 📈 Potential Improvements

1. Real-time updates (WebSockets)
2. Ticket comments/threading
3. Status updates (mark as resolved)
4. Analytics dashboard
5. Better AI prompts for categorization
6. Email templates
7. File attachments
8. Ticket search/filtering

---

## 🎓 Interview Tips

1. **Start with the problem:** "Manual ticket triage is slow and error-prone"
2. **Explain the solution:** "AI automatically analyzes and assigns tickets"
3. **Highlight architecture:** "Event-driven with Inngest for scalability"
4. **Show understanding:** Explain why you chose each technology
5. **Be honest about challenges:** AI parsing, skill matching complexity
6. **Mention improvements:** Shows you think about the product

**Remember:** You built this! Be confident, explain your decisions, and show passion for the project! 🚀
