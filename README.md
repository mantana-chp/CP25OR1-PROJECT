# 🐾 Pet Health Companion (CP25OR1)

A mobile application designed to help pet owners **track, manage, and maintain their pets’ health** through reminders, personalized notifications, and AI-assisted health advice — all in one platform.

---

## 📱 Overview

The platform aims to solve common pet care challenges such as:
- Forgetting important health appointments (e.g., vaccines, deworming)
- Scattered or inaccurate health records
- Lack of quick access to reliable pet health information

> 🧭 Our goal is to make pet care **simpler, smarter, and more consistent** for every owner.

---

## 🎯 Project Objectives

- To develop a **mobile application** for storing and managing pet health data  
- To provide **automated reminders and AI-assisted scheduling**  
- To deliver **personalized health notifications** and symptom-based chatbot support  
- To ensure the system is **accessible, friendly, and scalable**

---

## 🧩 Scope (Exam #2 Updated)

| Feature | Description |
|----------|--------------|
| **1. Pet Profile** | Store detailed pet information: species, breed, age, weight, and health history. |
| **2. Reminder** | Create and manage reminders for vaccination, deworming, or grooming in calendar view. |
| **3. Automated Health Scheduler & Reminder** | AI analyzes pet data to auto-schedule the next care event. |
| **4. Notification System & AI-Personalized Notifications** | In-app and push notifications tailored to each pet’s profile. |
| **5. Personalized Pet AI Chatbot** | Thai-language chatbot providing basic health and nutrition advice. |
| **6. News & Updates (Admin)** | Admin dashboard to publish pet-related news and campaigns. |

---

## 🏗️ System Architecture

- **Frontend:** Expo (React Native)
- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL
- **Storage:** MinIO (for images/files)
- **AI Services:**
  - **LLM:** Google Gemini 2.5 Flash (gemini-2.5-flash)
  - **Embeddings:** Google Gemini Embeddings (gemini-embedding-001)
  - **Vector Database:** Pinecone
  - **Architecture:** RAG (Retrieval-Augmented Generation)
- **Containerization:** Docker
- **OS Environment:** Ubuntu (SIT VM)
- **Push Notifications:** Expo Notifications (via FCM / APNs)

