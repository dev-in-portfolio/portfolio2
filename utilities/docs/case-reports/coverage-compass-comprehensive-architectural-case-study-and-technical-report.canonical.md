# Coverage Compass: Comprehensive Architectural Case Study and Technical Report

**Canonical Case Report**  
**Attribution:** Devin O’Rourke

## Overview

Coverage Compass represents a paradigmatic shift in the intersection of HealthTech, Generative Artificial Intelligence, and user-centric systems design. It is an intelligent cognitive middleware application designed to bridge the severe information asymmetry that exists between health insurance carriers and the patients they insure. The application functions not merely as a document reader, but as a context-aware reasoning engine capable of ingesting, parsing, and interpreting the complex, legally binding "Summary of Benefits and Coverage" (SBC) documents that govern American healthcare consumption.

In the current digital health landscape, the complexity of financial decision-making has become a primary barrier to care. Patients frequently delay or avoid necessary medical treatment due to an inability to predict costs, a phenomenon driven by the obfuscated nature of insurance terminology and the static, impenetrable format of policy documents. Coverage Compass exists to dismantle this barrier. By leveraging a monolithic architecture powered by Next.js, PostgreSQL, and OpenAI, alongside real-time voice infrastructure via LiveKit, the application democratizes access to actuarial-grade insights. It transforms the passive experience of "reading a policy" into an active, conversational consultation with an intelligent agent that understands the nuances of deductibles, coinsurance, and network adequacy.

The application serves a dual constituency. For the individual policyholder, it provides a "safe harbor" interface—a judgment-free, private digital space where sensitive questions regarding mental health coverage, maternity care, or chronic disease management can be asked without the friction of call centers or the ambiguity of keyword search. For the enterprise insurance provider, it operates as a high-efficiency deflection layer, capable of resolving the vast majority of routine coverage inquiries (Tier-1 support tickets) through automated, accurate AI responses, thereby reserving human capital for complex claims adjudication and care management.

This report provides an exhaustive technical and product analysis of Coverage Compass. It dissects the application's architectural decisions, from the choice of Drizzle ORM for type-safe database interactions to the implementation of Retrieval-Augmented Generation (RAG) pipelines for hallucination-resistant medical information retrieval. It explores the socio-technical problem space of US healthcare literacy, the intricate design challenges of visualizing probabilistic financial data, and the future-proofing strategies implied by its modular codebase.

## Problem Space

The problem space Coverage Compass addresses is defined by the "readability crisis" in healthcare documentation and the resultant financial toxicity experienced by patients. While the Affordable Care Act (ACA) mandated the creation of standardized Summary of Benefits and Coverage (SBC) forms to function like "Nutrition Facts labels" for health plans, the reality of these documents remains dense, jargon-heavy, and structurally complex.

### The Non-Triviality of Insurance Data

Insurance data is fundamentally non-trivial because it is deeply conditional. Unlike a standard e-commerce transaction where a price is static, the cost of a healthcare service is a dynamic variable dependent on a multi-dimensional state vector:

Provider Status: Is the provider in-network, out-of-network, or in a "tier 1" preferred network?

Temporal State: Has the patient met their deductible for the calendar year? Has the out-of-pocket maximum been reached?

Service Nuance: Is the service preventative (often $0) or diagnostic (subject to deductible)?

Prerequisites: Does the service require Prior Authorization (PA) or Step Therapy?.

Traditional relational database models struggle to capture this web of logic without becoming unwieldy. A "benefit" cannot simply be stored as a row in a benefits table with a cost column. It is a logic gate. Consequently, most existing digital tools fail to model the logic of the policy, forcing the user to perform the mental calculation. They present the raw data—"20% coinsurance after deductible"—but fail to compute the implication of that rule for a specific user in a specific context.

### The Failure of Legacy Search Mechanisms

Existing payer portals typically rely on keyword-based search engines (ElasticSearch or Solr implementations) to index PDF documents. This approach fails catastrophically in healthcare due to the "semantic gap" between patient intent and carrier terminology.

User Query: "I hurt my back, is a chiropractor covered?"

Document Term: "Spinal Manipulation Services" or "Rehabilitative Habilitation."

Result: A keyword search for "chiropractor" yields zero results, leading the user to falsely believe they have no coverage.

Coverage Compass addresses this specific failure by utilizing semantic vector search. By embedding the policy documents into a high-dimensional vector space, the system can map the vector for "back pain" to the vector for "spinal manipulation," bridging the gap between layperson language and medical-legal terminology.

### Cognitive Load and Decision Fatigue

The cognitive load required to interpret an SBC document is immense. These documents often rely on footnotes, cross-references, and exclusionary clauses that are spatially separated from the benefits they modify. For example, a coverage row might say "$20 Copay," but a footnote three pages later might clarify "Limit 20 visits per year.". For a user in a state of medical distress—perhaps managing a chronic illness or an acute injury—this spatial fragmentation becomes a barrier to care. Users frequently under-utilize their benefits or delay care due to the fear of unknown costs, a state known as "insurance paralysis".

### The Support Scalability Crisis

On the enterprise side, the complexity of these documents drives a massive volume of low-value, high-frequency support calls. Insurance call centers are inundated with questions like "What is my deductible?" or "Is urgent care covered?" These questions require human agents to open the same PDF the user has, read the same line, and repeat it back. This inefficiency bloats operational costs (SG&A) and contributes to high agent turnover due to the repetitive nature of the work. Coverage Compass identifies this inefficiency as a prime target for automation via Large Language Models (LLMs), which excel at summarization and information extraction tasks.

## Goals & Constraints

The development of Coverage Compass was driven by a specific set of product goals, shaped heavily by the rigorous constraints of the healthcare domain.

### Product Goals

#### 1. Zero-Friction Comprehension

The primary goal is to minimize the "time-to-understanding" for a user. In a traditional workflow, finding a coverage detail might take 10-15 minutes of logging in, finding the document, downloading the PDF, and visually scanning it. Coverage Compass aims to reduce this to under 15 seconds.

Success Metric: The user receives a definitive "Yes/No" or a specific dollar amount estimate without ever needing to open the source document.

Design Implication: This goal dictated the "Insight Card" UI pattern, which prioritizes the synthesized answer over the raw citation, although the citation remains available for verification.

#### 2. Multimodal Accessibility and Equity

Healthcare decisions do not always happen at a desk. They happen at pharmacy counters, in hospital waiting rooms, or while driving to an urgent care center. Furthermore, varying levels of literacy and tech-savviness create disparities in access.

Success Metric: The system must support full voice interactivity with a latency low enough to feel conversational (sub-500ms), allowing users to speak naturally rather than using "command" syntax.

Design Implication: This necessitated the integration of LiveKit for real-time audio transport, rather than relying on slower, request-response based transcription services. It also drove the requirement for multilingual support, ensuring non-English speakers can query English-language policies in their native tongue.

#### 3. Enterprise Deflection and Scalability

For the business client, the goal is to reduce the volume of support tickets reaching human agents.

Success Metric: A high "deflection rate"—the percentage of user sessions that resolve without escalating to a human agent.

Design Implication: The backend architecture required a robust RAG pipeline capable of ingesting thousands of distinct plan documents without requiring manual retraining or fine-tuning of the core model for each new plan year.

### Constraints

#### Technical Constraints

#### UX Constraints

Trust and Verification: Users are skeptical of AI in healthcare. The UX cannot simply present an answer; it must prove its work. This constraint dictated the UI layout, requiring a split-screen or "citation drawer" approach where the AI's response is visually linked to the highlighted section of the original PDF.

Medical Literacy Gap: The system must output answers at a 6th-grade reading level, regardless of the complexity of the input document. This constrained the "system prompt" engineering, requiring rigorous instructions on tone, simplicity, and terminology definition.

Emotional Context: Users may be stressed or scared. The UI must be calm, reassuring, and free of "marketing" fluff or aggressive gamification elements.

## Solution Architecture

The solution architecture of Coverage Compass is best understood as a Cognitive Middleware Pipeline. It does not create insurance data; it ingests disparate, unstructured artifacts (PDFs) and transforms them into a structured, queryable knowledge graph, which is then exposed through a natural language interface.

### Mental Model: The Agentic Consultant

The app is built around the mental model of an "Expert Medical Biller in Your Pocket." When a user interacts with the system, they are not searching a database; they are consulting an agent. The architecture reflects this agentic workflow:

Listen/Read: The system ingests user intent via text or voice.

Retrieve: It acts as a researcher, pulling the specific policy document associated with the user from the vector store.

Reason: It acts as an analyst, reading the relevant clauses and performing the logic/math required (e.g., subtracting the deductible from the procedure cost).

Respond: It acts as a translator, converting the technical finding into plain English.

### Conceptual Structure: The AI-Native Monolith

The structure was chosen to decouple the Interface Layer (Next.js/React) from the Intelligence Layer (OpenAI/RAG) and the Data Layer (PostgreSQL/Vector Store).

The monolithic approach (using Next.js for both frontend and API routes) was chosen over a microservices architecture.

Why Monolith? In the context of a high-fidelity prototype or an early-stage product, a monolith offers superior velocity and type safety. By sharing TypeScript interfaces between the frontend components and the backend database schemas (defined in Drizzle), the system eliminates a massive class of data synchronization errors. For a complex domain like insurance, where a "benefit" object might have 50 optional fields, this type safety is critical for system stability.

Why Not Microservices? Microservices introduce network latency and deployment complexity. For an app that relies on real-time voice interaction, internal network hops between a "Auth Service," "Chat Service," and "Billing Service" would add unacceptable latency to the conversational loop.

### Component Diagram (Inferred)

Client: React/Next.js App (Web & Mobile Web). Handles UI, Audio Capture/Playback.

Edge Layer: Next.js Middleware for Auth and Routing.

App Server: Next.js Server Actions / API Routes.

Orchestrator: Manages the chat session state.

Ingestion Engine: PDF parsing, OCR, Chunking.

RAG Controller: Query embedding, Vector search, Context assembly.

Data Persistence:

Relational: PostgreSQL (User profiles, Chat history, Plan metadata).

Vector: pgvector or Pinecone (Document embeddings).

Intelligence Provider: OpenAI API (GPT-4o or similar) for generation and reasoning.

Real-Time Media Server: LiveKit Cloud (Handling WebRTC, VAD, STT, TTS).

## Core Features (Deep Dive)

### 1. Retrieval-Augmented Plan Analysis (RAG)

This feature is the engine of the application. When a user uploads an SBC document or selects their active plan, the system does not merely store the file. It initiates an ingestion pipeline that performs Optical Character Recognition (OCR) and layout analysis to understand the document's structure.

Ingestion & Chunking: The document is segmented into semantic "chunks." Unlike standard text chunking, Coverage Compass likely employs structure-aware chunking to keep table rows together—critical for insurance data where a cell value is meaningless without its column header (e.g., "In-Network" vs. "Out-of-Network"). If a row is split across two chunks, the context is lost. The system likely converts PDF tables into Markdown or JSON representations before embedding.

Embedding & Retrieval: These chunks are embedded into vector space (using models like OpenAI's text-embedding-3-small) and stored. When a query arrives, it is also embedded, and a cosine similarity search retrieves the top-k most relevant chunks.

User Value: When a user asks, "Is acupuncture covered?", the system retrieves only the specific paragraph mentioning "Chiropractic and Other Rehabilitation Services," minimizing the context window noise and reducing hallucination risk.

System Fit: This feature is the foundation of the "Zero-Friction" goal, converting the static asset into dynamic knowledge.

### 2. Real-Time Cost Estimator and Logic Engine

Beyond static coverage confirmation ("Yes, it's covered"), this feature provides dynamic financial modeling. It calculates the estimated user liability based on the policy's math.

Mechanism: The system identifies numerical variables in the policy: Deductible, Coinsurance rate, and Out-of-Pocket Maximum. It then applies the logic: This calculation is performed by the LLM agent, which has been instructed to act as a calculator, or via a deterministic function call (tool use) if the variables are successfully extracted to structured fields.

User Value: This solves the "Cost Uncertainty" problem directly. Instead of "20% coinsurance," the user sees "Estimated cost: $150."

Interaction: Users can input hypothetical scenarios ("What if I need an MRI in November?") and the system adjusts the logic based on the user's year-to-date spending (if integrated) or assumes the deductible status.

### 3. Voice-Native Interaction (LiveKit Integration)

This feature allows for full duplex conversational interaction, mimicking a phone call with a human agent.

Mechanism: The app integrates LiveKit to handle real-time WebRTC audio streaming.

VAD (Voice Activity Detection): The system monitors the audio stream to detect when the user has stopped speaking. This is critical for natural turn-taking.

Interruption Handling: If the user speaks while the AI is talking ("Wait, stop!"), the VAD triggers an interrupt, halting the TTS stream immediately. This creates a feeling of "active listening" rather than a rigid command-response loop.

Pipeline: Audio -> LiveKit SFU -> STT (Deepgram/Whisper) -> LLM (OpenAI) -> TTS (ElevenLabs/OpenAI) -> LiveKit SFU -> Client Audio.

User Value: This supports accessibility for users with limited dexterity or visual impairments and reduces friction for all users. It transforms the interaction from "research" to "consultation".

### 4. Multilingual Support and Equity

Healthcare inequities are often exacerbated by language barriers. Coverage Compass includes native multilingual support without relying on separate localized databases.

Mechanism: The underlying LLM (OpenAI) is capable of cross-lingual reasoning. A user can ask a question in Spanish about an English-language policy document. The system retrieves the English chunks, translates the reasoning process, and generates the response in Spanish. The TTS engine is also selected to match the detected language.

User Value: This ensures that non-English speakers have the same level of granular access to their benefits as English speakers, a critical equity feature.

## User Flows (Narrative)

### The "Anxious Parent" Flow (Acute Care)

Context: Consider a user, "Alex," whose child has a high fever at 10:00 PM. Alex is stressed and unsure if they should go to the ER or an Urgent Care center.

Arrival: Alex opens Coverage Compass on their mobile device. The interface is calm, loading instantly. There is no complex dashboard; just a prominent microphone button and a text input field asking, "How can we help with your coverage today?"

Inquiry: Alex taps the microphone and speaks hurriedly: "My son has a fever. How much is the ER visit vs Urgent Care? We have the Silver PPO plan."

Processing: The system's VAD detects the end of the sentence. The UI shows a "Thinking..." state with a subtle waveform animation to indicate active listening. Behind the scenes, the RAG pipeline retrieves the "Emergency Services" and "Urgent Care" sections of Alex's Silver PPO SBC document.

Response: Within seconds, the voice assistant responds with a calm, synthetic voice: "For your Silver PPO plan, an Urgent Care visit has a flat copay of $50. An Emergency Room visit requires you to pay your deductible first, then 20% of the cost. Since you haven't met your deductible yet, the ER could cost over $500."

Visual Confirmation: Simultaneously, the screen displays a comparison card: "Urgent Care: ~$50" vs "Emergency Room: ~$500+." The relevant section of the PDF is highlighted below for verification.

Success: Alex decides on Urgent Care. The anxiety is managed through immediate, actionable financial data.

### The "New Hire" Flow (Plan Selection)

Context: Consider "Jordan," starting a new job and facing a choice between a High Deductible Health Plan (HDHP) and a PPO.

Ingestion: Jordan uploads the two PDF brochures provided by HR into Coverage Compass. The system processes them, extracting the benefits tables.

Comparison: Jordan types: "I see a therapist twice a month and take generic meds. Which plan is cheaper for me?"

Analysis: The system identifies the "Mental Health Outpatient" and "Prescription Drugs" rows in both documents. It projects the annual cost:

Plan A (PPO): (12 months * 2 visits * $20 Copay) + ($10 Meds * 12) + Premium.

Plan B (HDHP): (12 months * 2 visits * Full Cost until $3k Deductible) + Premium.

Recommendation: The system outlines: "The PPO has a higher premium, but the therapy copays are only $20. The HDHP requires you to pay full price for therapy until you spend $3,000. Based on your usage, the PPO will save you approximately $800 this year."

Success: Jordan selects the PPO with confidence, understanding the math behind the decision.

### The "Administrative Relief" Flow (Enterprise Support)

Context: An HR manager receives their 50th email asking, "Does our plan cover IVF?"

Deployment: The HR manager directs employees to the Coverage Compass portal embedded in the company intranet.

Self-Service: The employee logs in, asks the question, and the RAG system retrieves the "Infertility Treatment" exclusion clause from the specific plan document.

Resolution: The employee receives the answer ("Coverage is limited to diagnostic services only, treatment is not covered") instantly. The HR manager receives zero emails.

Success: The HR team saves time; the employee gets an instant answer without the embarrassment of asking a sensitive question to a colleague.

## Design & UX Decisions

### Restraint Over Density

The visual design prioritizes restraint. Healthcare dashboards often suffer from "data density," showing every claim, policy number, and Explanation of Benefits (EOB) at once. Coverage Compass adopts a "Google Search" paradigm: the screen is mostly empty until the user asks a question. This decision reduces the initial cognitive load (the "wall of text" effect) that causes users to abandon traditional portals. The interface likely uses ample whitespace and focused typography to create a sense of calm.

### Information Hierarchy: Synthesis > Data > Source

The hierarchy strictly follows a trust-building pattern:

Synthesis: The direct answer ("Yes, it is covered."). This is the largest, most prominent text.

Data: The specifics ("Subject to a $20 copay."). This appears as a supporting detail or a structured card.

Source: The verifiable proof ("See Page 4, Section 'Outpatient Services'"). This appears as a citation link or a collapsible drawer. This hierarchy builds trust. The user gets the immediate utility of the answer but retains the ability to "audit" the AI's logic, which is crucial in a low-trust domain like insurance.

### Trust Signals and "Medical Grade" UI

The UI utilizes a clean, sanitary aesthetic—likely using Shadcn/ui components which offer a standardized, professional look. The color palette likely leans on "medical blues," teals, and stark whites to convey sterility, precision, and authority. Typography is sans-serif, high-legibility (e.g., Inter or Geist Sans), ensuring readability on small mobile screens. Interaction patterns (like the microphone pulse) use smooth, physics-based animations to suggest a highly responsive, "alive" system, countering the perception of bureaucratic slowness associated with insurance.

### Accessibility Features

Given the "Coverage Compass" name and domain, accessibility is paramount.

Contrast: High contrast text for visually impaired users.

Voice: The primary accessibility feature, allowing hands-free and eyes-free operation.

Screen Reader Compatibility: Semantic HTML structure (Next.js default) ensures compatibility with JAWS/NVDA.

## Technical Architecture (Observed)

Based on the observable artifacts and the confirmed technology stack, the system employs a modern AI-Native Monolith architecture.

### Frontend Structure (Next.js)

Framework: Next.js (utilizing the App Router for React Server Components).

Rendering: The application heavily utilizes Server-Side Rendering (SSR) for the initial dashboard load to ensure performance.

Streaming: For AI responses, the architecture uses streaming text generation. This prevents the user from staring at a spinner for 10 seconds while the LLM thinks. The frontend establishes a stream reader to render tokens as they arrive, providing immediate visual feedback.

Component Library: Shadcn/ui and Tailwind CSS provide a composable, utility-first styling layer that ensures consistency and rapid iteration.

### Backend & Data Handling

Runtime: Node.js (via Next.js API routes or Server Actions).

Database: PostgreSQL is the system of record for user profiles, chat logs, and plan metadata.

ORM: Drizzle ORM is used for type-safe database interactions. This suggests a schema-first development approach, ensuring that the TypeScript interfaces in the frontend match the database reality.

Vector Store: The RAG architecture implies a vector database capabilities. Given the PostgreSQL stack, this is likely pgvector (integrated directly into Postgres) or a specialized external store like Pinecone to store the embeddings of the insurance documents.

Inference Engine: OpenAI (likely GPT-4o or GPT-4-Turbo) serves as the reasoning core. The system prompts likely include detailed "system instructions" to constrain the model to the healthcare domain and enforce the "Summary of Benefits" format.

### Real-Time Layer (LiveKit)

Infrastructure: LiveKit is utilized for the audio transport. This suggests a separate WebSocket server or a dedicated LiveKit Cloud instance handling the media server duties (SFU - Selective Forwarding Unit).

Workflow: The frontend connects to a LiveKit room. A backend "agent" (a worker process, possibly running on a separate specialized server or container) joins the room to listen, transcribe (STT), think (LLM), and speak (TTS). This separates the heavy media processing from the Next.js web server.

### Infrastructure & Deployment


CI/CD: Automated pipelines likely handle the build and deployment, with strict type checking (TypeScript) and linting ensuring code quality before production.

## Tradeoffs & Limitations

### Intentional Simplicity vs. Actuarial Precision

Tradeoff: The app prioritizes estimates and general coverage over 100% actuarial precision. It cannot know the real-time status of a user's deductible unless it integrates with the insurer's internal claims API (which is often locked down or requires legacy EDI integrations).

Limitation: The "Cost Estimator" is a model, not a ledger. It calculates based on the static PDF rules, not the dynamic claims feed. It might say "You pay $50," but if the user met their deductible yesterday and the PDF doesn't know, the user pays $0. This is a significant limitation for a "production" financial tool, making it an advisory tool rather than a billing tool.

### RAG Constraints on Tabular Data

Tradeoff: RAG is excellent for text but historically struggles with complex, multi-page tables common in SBCs.

Limitation: If a benefit spans two pages or is split across columns in a non-standard way (e.g., a "footnotes" section that isn't visually aligned), the parsing engine might fail to associate the "Limit" column with the correct "Benefit" row. The app likely limits support to standard SBC templates (which are federal mandates) to mitigate this, sacrificing universality for reliability.



Limitation: In a real-world deployment, handling PHI (Protected Health Information) requires significantly more rigorous infrastructure (e.g., dedicated isolated tenants) than a standard Next.js deployment offers. The current state is likely "de-identified" or relies on the user consenting to the processing of their data.

### Latency in Voice Interaction

Tradeoff: Using a powerful model like GPT-4o for reasoning adds latency compared to a smaller, faster model.

Limitation: While LiveKit optimizes the transport, the "time to think" for the LLM can still create awkward pauses in conversation, especially if the document retrieval step is slow. The system likely uses "filler words" or visual indicators to mask this latency, but it remains a constraint of current LLM technology.

## Current State Assessment



However, it is likely not fully production-ready for broad public release due to the "Edge Case" problem in healthcare. The sheer variety of insurance document formats, the risk of LLM hallucination in high-stakes medical advice, and the lack of integration with live claims data serve as the gap between this impressive demo and a venture-backed startup product. It is a "Vertical Slice" prototype that proves technical feasibility and UX viability.

### Completeness

The core loops (Auth -> Upload -> Chat -> Analyze) feel solid. The integration of voice elevates it above a standard "chatbot." The design language is consistent. The application successfully communicates its value proposition immediately upon use. The "Current State" is a functional MVP (Minimum Viable Product) that solves the core problem of "readability."

## Future Iterations

### 1. Integration with Payer APIs (FHIR)

The next logical step for scalability is to move beyond PDF parsing. Integrating with FHIR (Fast Healthcare Interoperability Resources) APIs would allow the app to pull structured, real-time data directly from insurers.

Benefit: This would transform the "Cost Estimator" from a theoretical calculator into an accurate ledger of the user's actual deductible status and claims history.

Implementation: Using the CMS Interoperability Rule APIs to authorize the app to fetch the user's EOBs (Explanation of Benefits).

### 2. Hybrid Search (Keyword + Vector)

To solve the "Specific Drug Name" problem (where a vector search might miss an exact match for a rare drug name due to embedding compression), the search architecture should evolve to a Hybrid Search model.

Benefit: This would combine semantic retrieval (vectors) with keyword matching (BM25).

Scenario: If a user asks about "Zolpidem," the system ensures it finds the exact line in the formulary list, even if the semantic context is weak.

### 3. Proactive "Wellness" Agents

The system could evolve from reactive (user asks question) to proactive.

Concept: By analyzing the plan, the AI could notify the user: "You have $200 in chiropractic benefits that expire on December 31st. Would you like to find an in-network provider?"

Shift: This shifts the mental model from "Support" to "Optimization," increasing user engagement and preventative care utilization.

### 4. Wearable Integration

Integrating with Apple Health or Google Fit to correlate health events with coverage.

Scenario: The user's watch detects a fall. The app proactively notifies: "If you need an X-Ray, here is the nearest in-network urgent care, and your estimated cost is $40."

## Key Takeaways

Coverage Compass is a definitive demonstration of Product Engineering. It showcases:

Systems Thinking: The ability to model a complex real-world domain (insurance logic) into a software architecture. It understands that data in this domain is conditional, not static.

Full-Stack Mastery: Proficiency across the entire stack, from the database schema (Drizzle/Postgres) to the edge runtime (Next.js) and the client interactivity (React/LiveKit).

AI Integration Competence: Going beyond basic OpenAI API calls to implement a RAG pipeline and real-time voice agents, demonstrating an understanding of the cutting edge of AI application development (Agents, RAG, Embeddings).

Empathy-Driven UX: A refusal to dump data on the user, instead prioritizing synthesis and clarity in a high-stress domain. It treats the user's attention as a scarce resource.


## Appendix: Terminology & Data Entities

### Terminology

### Data Entities (Simplified Schema)

User: id, email, active_plan_id

Plan: id, carrier_name, plan_type (PPO/HMO), sbc_document_url

ChatSession: id, user_id, created_at

Message: id, session_id, role (user/assistant), content, citation_ids

DocumentChunk: id, plan_id, content, embedding (vector), page_number

### Usage Notes

PDF Structure: The system currently assumes standard SBC formatting (federally regulated templates). Non-standard, handwritten, or image-only scans without OCR-able text layers would likely fail the ingestion pipeline.

Medical Advice: The system explicitly assumes it is not providing medical advice, only financial/coverage information. This distinction is likely hard-coded into the System Prompt to avoid liability.

#### Works cited

1. Healthcare software development services - Devōt, https://devot.team/projects/healthcare-software-development 2. Liberty Mutual Insurance Customer Ratings | Clearsurance, https://clearsurance.com/insurance-company/liberty-mutual-insurance-5835ece073b103329e91abc5 3. Analyzing Contracts: State of the Field, Mixed-Methods Guiding Steps, and an Illustrative Example | Law & Social Inquiry | Cambridge Core, https://www.cambridge.org/core/journals/law-and-social-inquiry/article/analyzing-contracts-state-of-the-field-mixedmethods-guiding-steps-and-an-illustrative-example/54EC75EA673D965EE6D8FE88C393FE67 4. Summary of Benefits and Coverage | HealthCare.gov, https://www.healthcare.gov/health-care-law-protections/summary-of-benefits-and-coverage/ 5. Empowering Informed Choice: Advancing Health Insurance Literacy in a Complex and Costly System - PMC, https://pmc.ncbi.nlm.nih.gov/articles/PMC12697310/ 6. Navigating the Maze: A Look at Patient Cost-Sharing Complexities and Consumer Protections - KFF, https://www.kff.org/private-insurance/navigating-the-maze-a-look-at-patient-cost-sharing-complexities-and-consumer-protections/ 7. Coverage Compass: AI-Driven Health Plan Assistance Case Study ..., https://devot.team/projects/coverage-compass-ai-platform 8. News and Insights Blog - FORTIS INVESTMENT GROUP of Companies, https://fortisinvestmentgroup.com/real-estate-blog/ 9. AI-assisted software engineering & custom development — Devōt, https://devot.team/ 10. Astro docs llms.txt, https://docs.astro.build/llms-small.txt 11. AI Software Development Services - Devōt, https://devot.team/services/ai-development 12. Summary of Benefits and Coverage (SBC) and Uniform Glossary | CMS, https://www.cms.gov/cciio/resources/fact-sheets-and-faqs/indexsummarybenefitscoverage 13. In their own words: Insured Americans struggle to navigate complex coverage - PhRMA, https://phrma.org/blog/in-their-own-words-insured-americans-struggle-to-navigate-complex-coverage 14. Unite your Patient's Data with Multi-Modal RAG | Databricks Blog, https://www.databricks.com/blog/unite-your-patients-data-multi-modal-rag 15. Policy Insights: Chatbots and RAG in Health Insurance Navigation - Velotio, https://www.velotio.com/engineering-blog/policy-insights-chatbots-and-rag-in-health-insurance-navigation 16. Hire Reactjs developers — Devōt, https://devot.team/technologies/hire-reactjs-developers 17. What healthcare AI agents can do today: Real-world use cases and impact - Infinitus AI, https://www.infinitus.ai/blog/what-healthcare-ai-agents-can-do-today-real-world-use-cases-and-impact/ 18. Turning Unstructured Healthcare Data into Answers with Retrieval Augmented Generation, https://healthedge.com/resources/blog/turning-unstructured-healthcare-data-into-answers-with-retrieval-augmented-generation 19. Why LLMs Are Not (Yet) the Silver Bullet for Unstructured Data Processing - Unstract, https://unstract.com/blog/why-llms-struggle-with-unstructured-data/ 20. A, C, e Series MFD Installation Instructions 87247-1-En - Scribd, https://www.scribd.com/document/786398294/A-c-e-Series-MFD-Installation-Instructions-87247-1-En 21. Middle Fullstack Developer (Next.js, Hono, Drizzle, AI SDK) at Elly Analytics - Remocate, https://www.remocate.app/jobs/middle-fullstack-developer-next-js-hono-drizzle-ai-sdk 22. A multi module a.i. system for intelligent health insurance support using retrieval augmented generation - PMC, https://pmc.ncbi.nlm.nih.gov/articles/PMC12796391/ 23. Care Cost Compass: An Agent System Using Mosaic AI Agent Framework | Databricks Blog, https://www.databricks.com/blog/care-cost-compass-agent-system-using-mosaic-ai-agent-framework 24. Voice AI Agents for Customer Service: Automating SaaS Helpdesks, https://www.bluetickconsultants.com/voice-ai-agents-for-customer-service/ 25. Best Voice Agent Stack: A Complete Selection Framework | Hamming AI Resources, https://hamming.ai/resources/best-voice-agent-stack 26. How generative AI voice agents will transform medicine - PMC - NIH, https://pmc.ncbi.nlm.nih.gov/articles/PMC12162835/ 27. Summary of Benefits and Coverage - Translated Templates - California Department of Insurance, https://www.insurance.ca.gov/0250-insurers/0300-insurers/0100-applications/hpab/SBC-Translated-Templates.cfm 28. The Role of Patient Navigators in Eliminating Health Disparities - PMC, https://pmc.ncbi.nlm.nih.gov/articles/PMC4121958/ 29. RAG in Healthcare: Transforming Clinical Documentation with Trust - CaliberFocus, https://caliberfocus.com/rag-in-healthcare 30. Voice AI quickstart | LiveKit Documentation, https://docs.livekit.io/agents/start/voice-ai-quickstart/ 31. HTN Now Awards 2025/26: Best AI scribe solution, https://htn.co.uk/htn-now-awards-2025-26-best-ai-scribe-solution/ 32. AI Chatbots for Healthcare: Use Cases, Architecture, Costs - ScienceSoft, https://www.scnsoft.com/healthcare/chatbots 33. Show us what you're building with the ChatGPT Apps SDK - OpenAI Developer Community, https://community.openai.com/t/show-us-what-you-re-building-with-the-chatgpt-apps-sdk/1365862?page=3 34. Compass.UOL vs Netlify Platform comparison - PeerSpot, https://www.peerspot.com/products/comparisons/compass-uol_vs_netlify-web-development-cloud 35. Challenges with effective price transparency analyses - Peterson-KFF Health System Tracker, https://www.healthsystemtracker.org/brief/challenges-with-effective-price-transparency-analyses/ 36. Projects — Devōt, https://devot.team/projects 37. Price Transparency in Health Care: Challenges, Opportunities, and the Path Forward, https://academyhealth.org/blog/2025-07/price-transparency-health-care-challenges-opportunities-and-path-forward 38. A first intro to Complex RAG (Retrieval Augmented Generation) | by Chia Jeng Yang, https://medium.com/enterprise-rag/a-first-intro-to-complex-rag-retrieval-augmented-generation-a8624d70090f
