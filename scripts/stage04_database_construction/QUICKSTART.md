# Quick Start Guide

Get the Algerian Chemogenomic Phytochemical Database running in 5 minutes.

## Prerequisites Check

```bash
# Check Node.js (need 18+)
node --version

# Check Python (need 3.10+)
python3 --version

# Check npm
npm --version
```

## Step 1: Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
pip3 install -r requirements.txt
cd ..
```

## Step 2: Verify Database

The Supabase database is already configured and migrations have been applied.

Check your `.env` file to confirm:
```
VITE_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
VITE_SUPABASE_SUPABASE_ANON_KEY=[your-key]
```

## Step 3: Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add:
```
SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
SUPABASE_KEY=[copy from project root .env: VITE_SUPABASE_SUPABASE_ANON_KEY]
DATA_DIR=./data
```

## Step 4: Start the Application

**Terminal 1 - Start Backend:**
```bash
cd backend
python main.py
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Terminal 2 - Start Frontend:**
```bash
npm run dev
```

You should see:
```
VITE ready in X ms
Local:   http://localhost:5173/
```

## Step 5: Access the Application

Open your browser to: **http://localhost:5173**

You should see the home page with:
- Navigation menu (Plants, Compounds, Diseases, etc.)
- Statistics dashboard
- Search bar

### Test the API

Open: **http://localhost:8000/api/docs**

You'll see the interactive API documentation (Swagger UI).

## Step 6 (Optional): Load Sample Data

If you have data files prepared:

```bash
# Create data directories
mkdir -p data/stage5_database_ready
mkdir -p data/stage6_curation
mkdir -p data/stage7_final_curation

# Copy your CSV files to these directories
# Then run:
cd backend
python -m etl.orchestrator
```

## What You Can Do Now

### Explore the Interface

1. **Plants Explorer** - Browse Algerian flora
2. **Compounds Explorer** - Search phytochemicals
3. **Coverage Dashboard** - View database statistics
4. **Admin Panel** - Manage submissions

### Test the API

Try these endpoints in your browser or with curl:

```bash
# Get health status
curl http://localhost:8000/api/health

# List plants
curl http://localhost:8000/api/plants

# Database stats
curl http://localhost:8000/api/analytics/stats

# Coverage analysis
curl http://localhost:8000/api/analytics/coverage
```

### Search Functionality

Use the search bar in the navigation to search across:
- Plants (by scientific name, genus, family)
- Compounds (by name, PubChem CID)
- Genes
- Pathways
- Diseases

## Common Issues

### Backend won't start

**Error:** `ModuleNotFoundError: No module named 'fastapi'`

**Solution:**
```bash
cd backend
pip3 install -r requirements.txt
```

### Frontend won't start

**Error:** `Cannot find module 'react'`

**Solution:**
```bash
npm install
```

### Can't connect to database

**Error:** `Connection refused` or `Invalid API key`

**Solution:**
- Check `.env` file has correct Supabase credentials
- Verify `backend/.env` has same SUPABASE_URL and SUPABASE_KEY
- Make sure Supabase project is active

### No data showing

**Solution:**
- The database starts empty
- You need to load data via ETL pipeline
- Or manually insert data via Supabase dashboard

## Next Steps

1. **Load Your Data** - Follow the ETL guide in README.md
2. **Configure Neo4j** (Optional) - For knowledge graph features
3. **Customize** - Modify colors, add features
4. **Deploy** - See deployment section in README.md

## Getting Help

- Check the full **README.md** for detailed documentation
- Review API docs at http://localhost:8000/api/docs
- Check backend logs for errors
- Inspect browser console for frontend errors

## Development Tips

### Hot Reload

Both frontend and backend support hot reload:
- Frontend: Edit files in `src/` - browser refreshes automatically
- Backend: Edit files in `backend/api/` - server reloads automatically

### Database Changes

To modify the database schema:
1. Create a new migration file
2. Use `mcp__supabase__apply_migration` tool
3. Restart backend to use new schema

### Adding Features

**New API endpoint:**
1. Add route in `backend/api/`
2. Import router in `backend/main.py`
3. Test at http://localhost:8000/api/docs

**New frontend page:**
1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/Layout.tsx`

## Success Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173
- [ ] Can access home page
- [ ] API docs accessible
- [ ] Search bar works
- [ ] Navigation works
- [ ] No console errors

**You're ready to start developing!**
