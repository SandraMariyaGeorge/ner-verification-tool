# Verification-Centric NER Annotation System

This project is a multi-user, project-based NER verification platform.

## Core Workflow

1. Signup/Login
2. Create project and upload dataset
3. Preview tokens with verification status
4. Sample only unverified tokens
5. Mark each sample as:
- correct: mark verified
- wrong: fix tag and mark verified
- flagged: mark flagged for follow-up
6. Track progress in real time
7. Export final corrected dataset

## Data Model Highlights

- users
- projects
- tokens
- sentences
- patterns
- samples

Token verification fields:
- verification_status: unverified | verified | flagged
- verified_by
- verified_at

Project progress fields:
- total_tokens
- verified_tokens
- flagged_tokens
- progress

## Backend API Highlights

- Auth:
	- POST /auth/signup
	- POST /auth/login
- Projects:
	- POST /projects/create
	- GET /projects?user_id=...
	- GET /projects/{project_id}
	- GET /projects/{project_id}/stats
- Verification Sampling:
	- GET /sample?project_id=...&size=...
	- POST /sample/correct
	- POST /sample/wrong
	- POST /sample/flag
- Preview and Export:
	- GET /preview?project_id=...&limit=...
	- GET /export?project_id=...

## Run

Backend:
- cd backend
- fastapi dev app/main.py

Frontend:
- cd frontend
- npm install
- npm run dev