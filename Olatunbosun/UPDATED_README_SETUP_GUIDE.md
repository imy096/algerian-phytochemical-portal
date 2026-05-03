
---

# 🎥 2. FULL VIDEO SCRIPT (READY TO READ)

---

## 🎬 INTRO

> Hello everyone,  
> In this video I will show you how to run the Algerian Chemogenomic Phytochemical Portal locally.  
> This platform integrates medicinal plants, phytochemicals, targets, and biological data into one research system.

---

## 🧰 STEP 1 — REQUIREMENTS

> First, install:
>
> - Git  
> - Python  
> - Node.js  
>
> Then verify using:
>
> ```powershell
> git --version
> python --version
> node --version
> npm --version
> ```

---

## 📥 STEP 2 — DOWNLOAD PROJECT

> Open PowerShell:
>
> ```powershell
> cd C:\Users\hp\Downloads
> git clone https://github.com/imy096/algerian-phytochemical-portal.git
> cd algerian-phytochemical-portal
> ```

---

## 📁 STEP 3 — GO TO MAIN FOLDER

> Navigate to:
>
> ```powershell
> cd scripts\stage04_database_construction
> ```

---

## 🌐 STEP 4 — DOWNLOAD FULL FILES

> Now download the complete files from Google Drive:
>
> 👉 https://drive.google.com/drive/folders/1mP9MnOzzwwFr1PPgWsN_DudTFa3VUrD5?usp=sharing
>
> After downloading:
>
> - extract the folder  
> - copy all files  
> - paste into this folder  

---

## ⚠️ IMPORTANT WARNING

> Do NOT create nested folders like:
>
> - public/public  
> - backend/backend  
>
> This is the most common error.

---

## 🧠 STEP 5 — VERIFY STRUCTURE

> Your folder must look like:
>
> - backend  
> - public  
> - src  
> - node_modules  
> - .venv  

---

## ⚙️ STEP 6 — RUN BACKEND

> Open PowerShell:
>
> ```powershell
> .\.venv\Scripts\Activate.ps1
> python -m uvicorn backend.main:app --reload
> ```
>
> Backend runs at:
>
> http://127.0.0.1:8000

---

## 💻 STEP 7 — RUN FRONTEND

> Open second terminal:
>
> ```powershell
> npm run dev
> ```
>
> Open:
>
> http://localhost:5173

---

## 🌐 STEP 8 — SHOW WEBSITE

> Now the portal is running.
>
> You can explore:
>
> - Plants  
> - Compounds  
> - Targets  
> - Graph  
> - Research Lab  

---

## ⚠️ STEP 9 — COMMON ERRORS

> If something fails:
>
> - check folder structure  
> - check backend running  
> - check `.venv`  
> - check `public/assets`  

---

## 🎯 OUTRO

> This platform supports chemogenomic research and hypothesis generation.  
> Thank you for watching.

---

