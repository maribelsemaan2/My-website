# Ignis AI

This repository contains Ignis AI's code for the NASA 2026 SpaceApps Hackathon.

**Selected Topic:** Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data

## Overview
The system has two parts, both built on NASA data:

- **Predictive Lab (ML):** a small model trained on 52 ISS microgravity tests (NASA BASS-II, PMMA rods) predicts the **flame spread rate (mm/s)** from oxygen %, airflow and rod diameter, with an error range, confidence level and out-of-range warnings. It predicts one number only: no flame shape, temperature or visual simulation, and no Moon/Mars (partial-gravity) predictions, because the NASA data contains none. See [backend/ai/ml/README.md](backend/ai/ml/README.md).
- **Ask the Data (RAG):** a chatbot that answers questions from NASA's PSI repository and the pages and PDFs linked from the challenge's Resources tab, citing its sources.

## Directory Structure
```
ignisai/
├── README.md              
├── frontend/              # web client
└── backend/               # server-side code
    ├── api/               # API layer that serving results to FE
    └── ai/
        ├── ml/            # flame spread-rate model, data, training and evaluation code
        └── rag/           # retrieval-augmented generation (rag) pipeline
```

## Local Installation and Setup
**To install the project into your local machine,** ```git clone``` this repository's link into your terminal.

**To run this project locally,** use the bash script in ```dev.sh``` to begin all dependecy installations. In order to do this, paste the following command in your terminal:

```bash
./dev.sh
```

Then, generate a Claude API key for the Chatbot via the [Claude Console](https://platform.claude.com/docs/en/api/beta/organization/api_keys), and paste it in the ```ANTHROPIC_API_KEY=``` variable inside ```backend/ai/rag/.env```.

You can then access ```http://localhost:5173/``` via your browser to display the project and interact with it.