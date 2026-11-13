# Ignis AI

This repository contains Ignis AI's code for the NASA 2026 SpaceApps Hackathon.

**Selected Topic:** Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data

## Overview
The system takes in raw NASA data and synthesizes it using an ML model to predict the final outlook of a flame and simulates it visually. The webapp also hosts a chatbot enhanced with RAG to answer end-users questions about data served.

## Directory Structure
```
ignisai/
├── README.md              
├── frontend/              # web client
└── backend/               # server-side code
    ├── api/               # API layer that serving results to FE
    └── ai/
        ├── ml/            # machine learning models and training code
        └── rag/           # retrieval-augmented generation pipeline
```