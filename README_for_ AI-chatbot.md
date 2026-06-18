# 🤖 TCET SARTHI

### AI-Powered Knowledge Assistant for TCET Centre of Excellence

TCET SARTHI is an intelligent role-aware AI chatbot designed for the TCET Centre of Excellence ecosystem. It combines Retrieval-Augmented Generation (RAG), Knowledge-Augmented Generation (KAG), Knowledge Graphs, SQL Retrieval, and AI Reasoning to provide accurate, context-aware answers to students and faculty.

---

## 🚀 Features

### 🧠 Hybrid AI Architecture

TCET SARTHI combines multiple retrieval and reasoning systems:

* Vector RAG Retrieval
* Knowledge Graph Reasoning (Neo4j)
* SQL Database Querying
* Tool Calling
* Role-Based Context Awareness
* Large Language Models (Ollama)

This allows the assistant to answer questions using both structured and unstructured institutional data.

---

## 🎯 Role-Based Intelligence

### Student

* Upcoming Hackathons
* Innovation Programs
* Grants & Funding Opportunities
* Facility Booking Assistance
* Event Information
* Problem Statements

### Faculty

* Student Innovation Data
* Research Opportunities
* Grant Information
* Innovation Analytics
* Program Management

### Admin

* Platform Insights
* User Analytics
* Innovation Metrics
* System Operations

---

## 🏗 AI Architecture

```text
User Query
    │
    ▼
Intent Router
    │
 ┌──┴───────┬────────┬────────┐
 ▼          ▼        ▼        ▼

SQL       RAG      KAG      Tools
(MySQL) (Chroma) (Neo4j) (Actions)

    │
    ▼

AI Reasoning Layer
(Qwen 3)

    │
    ▼

Natural Language Response
```

---

## 🧠 AI Stack

### LLM

* Qwen 3
* Ollama

### RAG

* ChromaDB
* Nomic Embeddings

### Knowledge Graph

* Neo4j
* Graph Traversal
* Relationship Reasoning

### Database

* MySQL
* Prisma ORM

### Backend

* Next.js 16
* TypeScript
* React 19

---

## 🔍 Retrieval Pipeline

### RAG Layer

Provides semantic search across:

* Innovation Programs
* Problem Statements
* Grants
* Announcements
* Events

### KAG Layer

Provides graph-based reasoning across:

* Faculty Expertise
* Innovation Domains
* Program Relationships
* Event Connections

### SQL Layer

Provides live structured data:

* News
* Events
* Grants
* Announcements
* User Information
* Facility Bookings

---

## 💬 Example Questions

### Student Queries

```text
Show upcoming hackathons.

What grants are currently available?

How do I book a laboratory?

Tell me about innovation programs.
```

### Faculty Queries

```text
Which grants are active?

Show innovation analytics.

What programs are currently running?
```

---

## ⚡ Technology Stack

| Layer           | Technology           |
| --------------- | -------------------- |
| Frontend        | Next.js 16, React 19 |
| Backend         | Next.js API Routes   |
| LLM             | Qwen 3 (Ollama)      |
| Vector Database | ChromaDB             |
| Knowledge Graph | Neo4j                |
| Database        | MySQL                |
| ORM             | Prisma               |
| Embeddings      | Nomic Embed Text     |
| Authentication  | JWT                  |
| Language        | TypeScript           |

---

## 🛠 Local Setup

```bash
git clone https://github.com/Tanmay5122/tcet-sarthi.git

cd tcet-sarthi

npm install

npm run dev
```

---

## 🎓 Developed For

**TCET Centre of Excellence (CoE)**

Thakur College of Engineering & Technology

Mumbai, India

---

## 👨‍💻 Developer

**Tanmay Walunj**

B.Tech Artificial Intelligence & Machine Learning

TCET Mumbai

---

## 🌟 Vision

Building an institutional AI assistant capable of understanding, reasoning, and retrieving knowledge from the entire TCET Centre of Excellence ecosystem through a hybrid RAG + KAG architecture.
