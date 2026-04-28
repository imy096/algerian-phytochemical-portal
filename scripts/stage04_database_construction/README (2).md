# Stage 04 — Database Import

This folder contains scripts and instructions for importing Stage 03 processed CSV files into Supabase/PostgreSQL.

## Input

Stage 04 uses outputs from:

data/stage03_database_preparation/outputs/

## Purpose

This stage will:
- create database tables
- import cleaned CSV files
- connect relationships between plants, compounds, pathways, proteins, GEO, and literature
- prepare the database for the web application

## Files expected later

- schema.sql
- import_data.py
- import_order.md
- README.md

## Important

Large CSV outputs are not stored in GitHub.

Place Stage 03 outputs locally before importing into the database.