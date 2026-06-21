**Kagaz-AI**
Kagaz-AI is an advanced full-stack AI platform engineered to bridge physical educational materials and digital analytics. Built for teachers and academic institutions, the system processes uploaded or captured handwritten student worksheets, applies localized optical character recognition (OCR), autonomously evaluates structural math and text answers, detects student pedagogical gaps, and surfaces comprehensive classroom intelligence.

🚀 Key Features
Multi-Modal Worksheet Ingestion: Supports direct camera capture compression algorithms or bulk image uploads for handwritten assignments.

AI-Powered Evaluation Pipeline: Integrates localized OCR text extraction with advanced Large Language Models (LLMs) to perform bias-corrected evaluation of complex student inputs (including algebra and missing answers).

Asynchronous Task Architecture: Leverages Celery backend queues to smoothly process complex image extraction tasks and heavy LLM workflows in parallel without stalling client requests.

Pedagogical Gap Analysis: Goes beyond generic pass/fail grading by extracting deeper student learning behaviors, specific error tracking, and macro dashboard analytics for whole classes.

Offline Resiliency & Multi-Lingual Architecture: Features local indexing capabilities for unreliable network connectivity environments, along with integrated internationalization translation matrices.

🛠️ System Architecture & Tech Stack
The application is structured explicitly as a decoupled monorepo splits between a high-performance backend analytics worker network and an editorial dashboard interface:

Backend Engine
Core Framework: FastAPI (Python 3.10) for lean, high-throughput asynchronous REST endpoint routing.

Task Management: Celery + Redis for distributed, async processing queues handling long-running image models.

Services Architecture: Custom evaluation pipeline parsing schemas using structured Pydantic models, custom OCR adapters, and automated bias-correction filters.

Frontend Client
Core Framework: Next.js (App Router execution) built with clean JavaScript modules.

Design System: Tailwind CSS coupled with dynamic, accessible UI blocks (shadcn/ui foundation primitives).

Utility Utilities: Custom camera context wrappers, runtime image compression hooks, and asynchronous API communication state machines.
