# Kagaz AI

**Kagaz AI** is an intelligent pedagogy assistant that helps educators effortlessly scan, grade, and analyze handwritten student worksheets using advanced multimodal AI.

## The Kagaz AI Architecture

Instead of relying on rigid, resource-heavy legacy OCR pipelines that fail on handwritten documents, Kagaz-AI utilizes an End-to-End Multimodal Vision-to-Text Architecture via **Gemini 1.5 Flash**. 

This eliminates cascading OCR errors, reduces server memory footprint by offloading processing to cloud TPUs, and achieves near-human accuracy on unstructured handwriting in a single inference cycle.

### Key AI Efficiency Achievements:

1. **Contextual Semantic Correcting:** Traditional OCR reads character-by-character and easily confuses handwritten letters (like turning a "g" into a "9"). Our multimodal LLM reads the entire sentence structure at once, using semantic reasoning to accurately guess messy handwriting based on context.
2. **Compute Offloading:** Instead of wasting local CPU and RAM on the backend server to parse heavy graphics libraries, our backend acts as a lightweight, memory-efficient router that offloads the heavy visual computation to Google's specialized TPU infrastructure.
3. **Zero-Shot Adaptability:** Traditional OCR requires fine-tuning or specialized layouts to read tables, checkboxes, or irregular handwritten notes. The multimodal LLM handles unstructured document layouts instantly without any extra training data.

## Tech Stack
- **Frontend**: Next.js
- **Backend**: FastAPI
- **Database**: PostgreSQL (Supabase)
- **AI Core**: Google Gemini 1.5
