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
        └── rag/           # retrieval-augmented generation (rag) pipeline
```

## Local Installation and Setup
To run this project locally, use the bash script in ```dev.sh``` to begin all dependecy installations. In order to do this, paste the following command in your terminal:

```bash
./dev.sh
```

Then, generate a Claude API key for the Chatbot via the [Claude Console](https://platform.claude.com/docs/en/api/beta/organization/api_keys), and paste it in the ```ANTHROPIC_API_KEY=``` variable inside ```backend/ai/rag/.env```.

You can then access ```http://localhost:5173/``` via your browser to display the project and interact with it.