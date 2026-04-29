# Installation Guide

## 1. Clone the repository

git clone https://github.com/imy096/algerian-phytochemical-portal.git
cd algerian-phytochemical-portal

---

## 2. Python environment (data pipeline)

Install required packages:

pip install -r requirements.txt

---

## 3. Frontend application

Install dependencies:

npm install

Run development server:

npm run dev

---

## 4. Environment variables

Create a file named `.env` in the root directory:

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key

IMPORTANT:
Do NOT upload `.env` to GitHub.

---

## 5. External data

Download required datasets and place them in:

data/stage01d_pdf_phytochemical_extraction/raw/pdfs/
data/stage02_compound_enrichment/external/

Required data includes:
- STITCH dataset
- NMR dataset
- PDF phytochemical files

---

## 6. Running the pipeline

Run scripts stage by stage:

scripts/stage01_...
scripts/stage02_...
scripts/stage03_...

---

## Notes

- Large data files are NOT included in this repository
- Outputs are generated locally