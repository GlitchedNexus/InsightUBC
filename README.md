# InsightUBC Query Engine

A backend data management and query processing system built in **TypeScript** for ingesting, persisting, and querying structured academic datasets via a RESTful API.

This project emphasizes clean software architecture, defensive programming, and correctness under complex query constraints.

---

## Features

- **Dataset Management**
  - Add, remove, list, and persist datasets across server restarts
  - Support for structured academic data (sections, rooms)
  - Validation and normalization during ingestion

- **Query Engine**
  - Logical filtering (`AND`, `OR`, `NOT`)
  - Numeric and string comparisons
  - Grouping and aggregation with transformations
  - Multi-key sorting and projection
  - Strict query validation with meaningful error handling

- **REST API**
  - HTTP endpoints for dataset management and query execution
  - Structured JSON request/response contracts
  - Clear separation between API, controller, and business logic

- **Persistence Layer**
  - File-based dataset serialization
  - Dataset caching for efficient query execution
  - Safe reload on application restart

---

## Architecture

```Text
src/
├── controller/ # Public interface and orchestration layer
├── QueryEngine/ # Query parsing, filtering, transformations
├── DataProcessor/ # Dataset-specific models and helpers
├── Persistence/ # Disk I/O and dataset storage
├── rest/ # Express server and routing
├── App.ts # Application entry point
└── frontend # Next.js Dashboard
```

The system is designed with **clear module boundaries** to ensure maintainability and testability.

---

## Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js
- **API:** Express
- **Data Handling:** JSON, file-based persistence
- **Testing:** Automated unit and integration tests
- **Tooling:** Git, ESLint, Prettier

---

## What I Learned

- Designing and implementing a **non-trivial query language**
- Building **robust backend systems** with strict interface contracts
- Structuring large TypeScript codebases for clarity and scalability
- Writing defensive code to handle malformed inputs and edge cases
- Separating API, business logic, and persistence concerns

---

## Running the Project

```bash
npm install
npm run build
npm run start
```
The server exposes REST endpoints for dataset management and query execution.

## Notes
This project was developed as part of a rigorous backend systems course and focuses on correctness, architecture, and software engineering fundamentals rather than UI.

---
