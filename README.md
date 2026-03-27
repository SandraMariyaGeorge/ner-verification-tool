# Malayalam NER Verification Tool

This repository is scaffolded for a 3-phase NER dataset verification workflow.

## Functional Modules

1. Dataset Loading and Sampling
- Load large NER datasets (10k+ words)
- Preview parsed tokens
- Random sampling by user-selected size
- Show token context (previous/next words) with highlighted target token
- Allow manual tag correction

2. Entity-Based Bulk Correction
- When one token tag is changed, fetch all matching entity surface forms across dataset
- Review and apply bulk tag updates

3. Pattern Error Detection and Bulk Fix
- Detect repeated BIO inconsistencies (example: `B-PER` followed by `B-LOC` where `I-PER` is expected)
- List all pattern matches
- Apply grouped fixes

## Scaffolded Structure

```text
ner-verification-tool/
|-- backend/
|   |-- app/
|   |   |-- main.py
|   |   |-- config/
|   |   |   `-- db.py
|   |   |-- models/
|   |   |   |-- dataset_model.py
|   |   |   |-- sentence_model.py
|   |   |   |-- token_model.py
|   |   |   |-- pattern_model.py
|   |   |   `-- edit_model.py
|   |   |-- schemas/
|   |   |   |-- dataset_schema.py
|   |   |   |-- token_schema.py
|   |   |   |-- pattern_schema.py
|   |   |   `-- edit_schema.py
|   |   |-- routes/
|   |   |   |-- upload_routes.py
|   |   |   |-- sampling_routes.py
|   |   |   |-- entity_routes.py
|   |   |   `-- pattern_routes.py
|   |   |-- services/
|   |   |   |-- parser_service.py
|   |   |   |-- sampling_service.py
|   |   |   |-- entity_service.py
|   |   |   `-- pattern_service.py
|   |   |-- utils/
|   |   |   |-- bio_validator.py
|   |   |   |-- helpers.py
|   |   |   `-- constants.py
|   |   `-- core/
|   |       `-- settings.py
|   |-- requirements.txt
|   `-- run.py
|-- frontend/
|   |-- app/
|   |   |-- layout.js
|   |   |-- page.js
|   |   |-- globals.css
|   |   |-- sampling/
|   |   |   `-- page.jsx
|   |   |-- entity/
|   |   |   `-- page.jsx
|   |   |-- patterns/
|   |   |   `-- page.jsx
|   |   `-- api/
|   |       |-- upload/route.js
|   |       |-- preview/route.js
|   |       |-- sample/route.js
|   |       |-- update/route.js
|   |       |-- entity/route.js
|   |       |-- entity/update/route.js
|   |       |-- patterns/errors/route.js
|   |       |-- patterns/fix/route.js
|   |       `-- export/route.js
|   |-- components/
|   |   |-- Common/
|   |   |   `-- TagDropdown.jsx
|   |   |-- Sampling/
|   |   |   |-- SampleControls.jsx
|   |   |   |-- SampleList.jsx
|   |   |   |-- TokenCard.jsx
|   |   |   `-- ContextViewer.jsx
|   |   |-- Entity/
|   |   |   `-- BulkEditModal.jsx
|   |   `-- Patterns/
|   |       |-- PatternList.jsx
|   |       `-- PatternCard.jsx
|   |-- lib/
|   |   |-- api.js
|   |   `-- proxy.js
|   |-- .env.example
|   |-- package.json
|   `-- next.config.js
`-- README.md
```

## Next Step

Add your backend and frontend implementation module-by-module in the scaffolded files.
