# Alibi — Logged & Verified: Architectural Case Study

**Canonical Case Report**  
**Attribution:** Devin O’Rourke

## Overview

Alibi — Logged & Verified represents a fundamental architectural shift in the management of digital provenance and data integrity. In an era where digital content is increasingly mutable—subject to deepfakes, database injection attacks, and silent administrative revision—Alibi establishes a paradigm of "Trustless Verification." The application functions as a decentralized verification engine, designed to anchor discrete data events onto an immutable public ledger. By leveraging Distributed Ledger Technology (DLT), specifically the Hedera Consensus Service (HCS), Alibi decouples the "storage" of data from the "witnessing" of data, ensuring that the proof of an event’s occurrence is mathematically secured and independent of the data creator’s own infrastructure.

The application is not merely a logging tool; it is a compliance primitive designed for high-stakes environments where "he-said, she-said" disputes carry significant financial or legal risk. It targets a user base of systems architects, supply chain managers, financial auditors, and legal technologists who require a higher standard of evidence than a standard SQL database log can provide. In traditional systems, a log file is only as trustworthy as the administrator who controls the server. If that administrator has root access, they can theoretically rewrite history. Alibi eliminates this "Superuser Risk" by writing the audit trail to a public network where no single entity holds the private keys to the entire history.

Operating at the intersection of Fintech, LegalTech, and Web3, Alibi abstracts the complexity of cryptographic hashing and distributed consensus into a user-friendly interface. It allows non-technical users to generate cryptographic proofs for invoices, contracts, and system alerts. The application demonstrates a sophisticated understanding of the "Oracle Problem"—the difficulty of connecting real-world data to a blockchain—by focusing on "Proof of Existence" rather than "Proof of Truth." It does not claim the data is true; it proves, largely beyond legal reproach, that the data existed in a specific state at a specific nanosecond in time.

The existence of Alibi is a response to the fragility of digital truth. As automated systems for invoicing and supply chain management become ubiquitous, the potential for fraud increases. "Double financing"—where a single invoice is sold to multiple factors—is a classic example of a problem caused by the lack of a shared, immutable registry. Alibi exists to solve this by creating unique, burnable digital assets that represent real-world liabilities, effectively tokenizing the concept of "debt" and "delivery" in a way that is transparent to all permitted parties.

## Problem Space

### The Crisis of Mutable History

The core problem Alibi addresses is the inherent mutability of standard database architectures. In the vast majority of enterprise applications, data is stored in relational databases (PostgreSQL, MySQL) or document stores (MongoDB). These systems are designed for efficiency and flexibility, prioritizing features like UPDATE and DELETE. While these commands are essential for data maintenance, they are catastrophic for data integrity in adversarial environments.

In a dispute between a Supplier and a Client regarding the timestamp of a submission, the party controlling the database holds the power to manipulate the evidence. A database administrator can alter a timestamp, delete a row, or modify a payload, often leaving no trace if they also scrub the internal access logs. This creates a "Trust Gap." Parties must trust the counterparty's IT security and moral integrity. In global supply chains involving distinct legal jurisdictions and competitive entities, this trust is often nonexistent or contractually expensive to enforce.

### The Inadequacy of Traditional Logging

Existing solutions to this problem, such as Write-Once-Read-Many (WORM) storage or centralized logging services (e.g., Splunk), suffer from two fatal flaws: centralization and opacity.

Centralization: Even a WORM drive is physically located in a data center controlled by one party. That party can physically destroy the drive or corrupt the hardware.

Opacity: To verify a log in a centralized system, an auditor typically needs privileged access. This makes "public verification" impossible without exposing sensitive internal systems.

### The Complexity of Blockchain Adoption

Conversely, while public blockchains (Bitcoin, Ethereum) offer immutability, they introduce extreme friction.

Cost: "Anchoring" a single document on Ethereum can cost anywhere from $5 to $50 depending on network congestion. This is economically unviable for high-volume enterprise logging.

Latency: Waiting 10 to 60 minutes for block confirmations disrupts modern UX workflows.

Privacy: Putting raw data on a public chain violates GDPR and CCPA, as the data can never be deleted.

Alibi identifies this "Goldilocks" gap: the need for a solution that is as secure as a blockchain, as fast as a web API, and compliant with privacy laws. The problem is non-trivial because it requires balancing these competing constraints—security vs. speed, transparency vs. privacy—within a seamless user experience that does not require the user to manage private keys or cryptocurrency wallets.

### The "Black Box" of Automated Systems

Users interacting with automated verification systems often face a "Black Box" risk. They upload a document, see a green checkmark, and assume they are safe. But they have no independent way to verify that the system actually performed the check. Alibi addresses the psychological and operational risk of this opacity by surfacing the "backend" verification process directly to the user interface. By exposing the hash and the consensus timestamp, the app bridges the gap between the invisible backend logic and the visible frontend assurance.

## Goals & Constraints

### Product Goals

#### 1. Immutable Data Anchoring (The "Witness" Function)

The primary goal is to create a permanent, unalterable link between a digital object (e.g., a JSON invoice) and a public ledger. Success is defined as a system where, even if the Alibi application servers are destroyed, the proof of the data's existence persists on the network. This goal shaped the decision to use a public consensus service (Hedera) rather than a private database. The system must effectively "witness" the data without taking ownership of it.

#### 2. Zero-Knowledge Verification (Privacy Preservation)

The system must allow verification without necessarily revealing the content of the data to the entire world. This is a subtle but critical privacy goal, especially in light of "Right to Be Forgotten" (RTBF) regulations. Success implies that a user can prove they possess the original document without publishing the document itself to the public ledger. This drove the architectural decision to anchor hashes (SHA-256 digital fingerprints) rather than raw text. The goal is to verify the integrity of the data, not the content.

#### 3. Instant Auditability (The "One-Click" Standard)

A user must be able to verify a record in seconds, not days. Success is defined by a "one-click" verification flow where the app queries the ledger and returns a boolean "Verified" or "Failed" state. This goal prioritized the use of high-throughput, low-latency networks over slower, Proof-of-Work chains. The system aims to democratize auditing, making it accessible to non-technical stakeholders like junior auditors or dispute resolution mediators.

#### 4. Lifecycle Management via Tokenization

Beyond simple logging, the goal is to manage the lifecycle of the data. An invoice is not just a static document; it is a request for payment that is eventually satisfied. The system aims to represent this state change (Unpaid -> Paid) cryptographically. This led to the integration of the Hedera Token Service (HTS) to mint and burn tokens representing the asset, creating a dynamic link between the static log and the active value.

### Constraints

#### Technical Constraints

Network Latency & Finality: The underlying distributed ledger must offer near-instant finality. Waiting for probabilistic finality (like in Bitcoin) is unacceptable for a modern UX. This constrained the choice of backend infrastructure to DAG-based (Directed Acyclic Graph) networks like Hedera, which offer 3-5 second consensus finality.

Stateless Architecture: To ensure the app is a true "client" of the network and not a centralized gatekeeper, the architecture acts largely as a stateless interface. The "state" is the ledger. This forces the frontend to rely heavily on API queries to public mirror nodes rather than local caching.

Browser Security Sandbox: Since the app performs cryptographic hashing client-side to ensure privacy, it is constrained by the performance limits of JavaScript in the browser and the security context of the user's device.

#### UX Constraints

Complexity Abstraction: The user should not need to know what a "hash," "node," or "gas fee" is to use the app. However, the app must strictly avoid hiding the mechanics to the point of obscuring the security model. This forces a design tradeoff: the UI must display technical artifacts (like Transaction IDs) but present them as "Receipts" or "Confirmation Codes."


#### Scope Constraints


Single-Payer Model: To reduce friction, the app likely pays the transaction fees on behalf of the user (via a backend faucet or funded account). This creates a scope constraint where the app is vulnerable to running out of funds if spammed, necessitating rate limiting or CAPTCHA implementation in a production scenario.

## Solution Architecture

### Conceptual Model: The Digital Notary

Alibi is built around the mental model of a "Digital Notary." When a user interacts with the system, they are essentially performing two distinct actions:

Stamping (Anchoring): Taking a snapshot of a document, sealing it, and getting a time-stamped receipt.

Verifying (Auditing): Taking a receipt and a document to the notary to confirm the seal is unbroken.

This model replaces the abstract concept of "Database Writes" with the tangible concept of "Anchoring." Users are expected to think of their data not as sitting "inside" the app, but as being "anchored" to the public network through the app. The app is merely the pen; the network is the permanent paper.

### System Components and Topology

The architecture is composed of three distinct layers, adhering to a "Thick Client, Thin Server, Public Network" topology.

#### 1. The Client (Frontend) - The Privacy Layer

This is a purely functional layer that handles user input, calculates SHA-256 hashes locally, and constructs transaction payloads. It holds no persistent state of its own. Crucially, this layer performs the hashing before data transmission. This ensures that the raw invoice data never leaves the user's browser, satisfying strict privacy constraints. The frontend serves as the user's private enclave.

#### 2. The Bridge (API/SDK) - The Relay Layer

This layer acts as the transmission mechanism, sending the constructed payloads to the Distributed Ledger. It manages the API keys (likely kept secure via environment variables in a serverless function) and the specific logic for "Minting" or "Logging". It is a "Relay" because it does not store data; it simply authenticates the request and forwards the hash to the Hedera network, paying the micro-transaction fee involved.

#### 3. The Truth (The Ledger) - The State Layer

The Hedera Consensus Service (HCS) and Token Service (HTS) constitute the database of record. This is where the "Truth" resides.

HCS (Topics): Used to store the immutable logs of hashes.

HTS (Tokens): Used to represent the value or ownership of the logged items.

Mirror Nodes: These are public read-only nodes that the frontend queries to verify transactions. By reading from Mirror Nodes, Alibi ensures it is reading the public state, not a cached internal state.

### Why This Structure?

This structure was chosen to maximize Trust Minimization. If Alibi used a traditional backend database (e.g., MongoDB), the user would have to trust the developer's integrity not to alter the records. By offloading the storage of the proof to a public network, the architecture removes the developer from the trust equation. The app becomes merely a window into the ledger. Additionally, the use of Hedera (a DAG) over a Blockchain (like Ethereum) was chosen for cost stability (fees are pegged to USD) and speed, which are prerequisites for enterprise adoption.

## Core Features (Deep Dive)

### 1. Data Anchoring (The "Log" Action)

Feature Name: Immutable Anchoring via HCS What it does: This feature allows users to input structured data—specifically JSON objects representing invoices or other transactional documents. The app takes this input, standardizes it (canonicalization), generates a SHA-256 hash, and submits this hash to a specific Topic on the Hedera Consensus Service.

Why it exists: Raw data is heavy and often private. Storing a full invoice on a public network violates privacy norms and is prohibitively expensive. Anchoring the hash allows the system to prove the document's integrity without revealing its contents.

User Interaction: The user pastes or types JSON data into an input field. Upon clicking "Log" or "Anchor," the system computes the hash in real-time (providing visual feedback of the hash string) and submits it. The interface transitions to a "Pending" state, waiting for the network consensus timestamp.

Problem Solved: It solves the "Edit History" problem. Once the hash is anchored, no one—not the user, not the admin—can change the fact that that specific data existed at that specific time.

System Fit: This is the foundational layer. Every other feature relies on the integrity of this log.

### 2. Asset Tokenization (The "Mint" Action)

Feature Name: Invoice Tokenization via HTS What it does: Beyond simple logging, Alibi allows for the creation of assets representing the data. This utilizes the Hedera Token Service (HTS) to mint fungible tokens. For example, an invoice for $1000 can be minted as 1000 units of a specific token.

Why it exists: In a supply chain or finance context, a log entry is not enough; one often needs to represent ownership or value. By minting tokens that correspond to an invoice, the system creates a tradable, transferable representation of the debt or asset. This turns a static PDF invoice into a dynamic digital asset (Invoice Factoring).

User Interaction: The user defines the parameters of the asset (Name, Symbol, Decimals). The app interacts with the HTS to mint these tokens on the network. The UI displays the new "Token ID" and the current supply.

Problem Solved: It solves the "Double Spend" or "Double Financing" problem. If an invoice is tokenized, the possession of the token represents the right to be paid. You cannot sell the token to two different people because the ledger prevents it.

System Fit: This bridges the gap between "Data" (the invoice details) and "Value" (the money owed).

### 3. Settlement & Burning (The "Burn" Action)

Feature Name: Supply Reduction (Burning) What it does: Alibi includes a mechanism to "Burn" tokens, removing them from circulation permanently. This represents the settlement of a debt or the completion of a contract.

Why it exists: A digital verification system must handle the entire lifecycle of an asset. If an invoice is paid, the digital representation of that debt must be destroyed to prevent it from being traded again. Burning is the cryptographic equivalent of shredding a paid promissory note.

User Interaction: The user selects a token balance and initiates a "Burn" transaction. The UI updates to reflect the reduced total supply, providing visual confirmation that the liability has been extinguished.

Problem Solved: It provides "Proof of Settlement." A supplier can prove they have closed the invoice, or a debtor can prove they have paid (if the burn logic is tied to payment).

System Fit: This completes the lifecycle: Create (Mint) -> Verify (Log) -> Destroy (Burn).

### 4. External Verification (HashScan Integration)

Feature Name: Third-Party Audit Linking What it does: The app provides direct links to external block explorers (HashScan) for every action.

Why it exists: This is the "Trustless" component. By pushing the user out of the app to a third-party validator, Alibi proves it is not faking the results. It invites the user to audit the system independently.

User Interaction: After any Log, Mint, or Burn action, a "Verify on HashScan" link appears. Clicking this opens a new tab showing the raw transaction on the public ledger.

Problem Solved: It solves the "Fake UI" problem. A malicious app could simply display a green checkmark without actually doing anything. By linking to an external source of truth, Alibi validates its own honesty.

System Fit: This serves as the final confirmation step in every user flow.

## User Flows (Narrative)

### The Creator's Journey: Establishing the Alibi

The user enters the application with a specific intent: to secure a digital record. They are likely a supplier issuing an invoice or a developer logging a build artifact. They arrive at the "Dashboard," a clean, minimal interface split into "Log," "Mint," and "Burn" modes.

The user selects "Log." They are presented with a large text area labeled "JSON Payload." They paste their invoice data: {"id": "INV-001", "amount": 5000, "client": "Acme Corp"}. As they type, the app immediately calculates the SHA-256 hash in a small, monospace display below the box. This provides instant feedback—the system is "listening" to the data.

Satisfied, the user clicks "Anchor to Ledger." The button state changes to "Consensus Pending..." A progress bar, perhaps pulsing, represents the network negotiation. In the background, the app is bundling the hash and sending it to the Hedera network. After approximately 3-5 seconds (the time to finality), the UI shifts to a success state. A green badge appears: "VERIFIED."

Below the badge, a "Receipt" card generates. It contains the Topic ID, the Sequence Number, and the Consensus Timestamp. Crucially, it provides a "View on HashScan" link. The user clicks it, verifying that their hash is indeed etched onto the public graph. They now leave the app, copying the Transaction ID to their own records. They have successfully created an alibi.

### The Verifier's Journey: The Audit

Weeks later, an auditor (or a financing partner) receives the invoice and the Transaction ID. They open Alibi and switch to "Verify" mode. They are skeptical; they want to ensure the invoice hasn't been doctored to change the amount from 5000 to 50000.

They paste the JSON file they received into the "Data" field. They paste the Transaction ID into the "Reference" field. The app performs two operations in parallel:

It hashes the pasted JSON locally.

It queries the Hedera Mirror Node for the hash stored at that Transaction ID.

The app compares the two strings.

Scenario A (Success): The strings match perfectly. The screen turns green: "MATCH CONFIRMED." The auditor knows the file is authentic.

Scenario B (Failure): The invoice was altered. The hashes diverge completely. The screen turns red: "INTEGRITY FAILURE." The app highlights the mismatch, showing the "Stored Hash" vs. the "Calculated Hash."

This flow is binary and definitive. There is no "maybe." The user leaves with absolute certainty regarding the document's integrity.

## Design & UX Decisions

### Information Hierarchy: Clarity over Density

In a technical tool dealing with hashes, ledgers, and token IDs, the temptation is to show every byte of metadata. Alibi resists this. The design prioritizes Status and Action.

Primary: The "Success/Fail" state is the most dominant visual element.

Secondary: The "Hash" and "Transaction ID" are visible but smaller, often in monospace fonts to denote technical data.

Tertiary: Network details (Node ID, Gas Fee) are abstracted away or hidden behind tooltips.

This hierarchy reduces cognitive load. The user primarily wants to know "Did it work?" and "Is it safe?" The design answers these questions first.

### Layout and Composition: The Split Pane

The layout likely employs a split-pane or card-based interface to separate "Input" (mutable) from "Output" (immutable).

Left/Top: The Workspace. Input fields, text areas. This is where the user works.

Right/Bottom: The Ledger View. Read-only receipts, logs, and verification results. This is where the network speaks.

This separation enforces the mental model that the user submits to the ledger, and the ledger returns a result.

### Interaction Patterns: The "Commit" Metaphor

The interaction pattern for submitting data is designed to feel weighty. Buttons are labeled with definitive verbs like "Anchor," "Mint," "Burn" rather than generic web terms like "Submit" or "Save." This aligns with the immutability of the backend—once you click, you cannot "Undo." The UI deliberately introduces a confirmation step or a clear visual transition to emphasize the permanence of the action.

### Restraint vs. Density

The visual design uses restraint to build trust. A cluttered interface suggests chaos; a clean, stark interface suggests precision. The use of "Terminal" aesthetics—monospace fonts, high-contrast dark modes—signals to the target audience (engineers, auditors) that this is a professional-grade tool, not a consumer toy.

### Visualizing the Invisible

Trust is visualized through external references. The decision to make the "Verify on HashScan" link prominent is a key UX decision. It says, "Don't take our word for it." By voluntarily relinquishing the "walled garden" and sending the user to a third-party explorer, the design paradoxically increases retention and trust in the app itself.

## Technical Architecture (Observed)

### Frontend Structure and Organization

The application is built as a Single Page Application (SPA), utilizing a lightweight, component-based architecture. Given the developer's penchant for "Standalone HTML" , the structure is likely monolithic in its deployment (a single bundle) but modular in its code.

Framework: Likely React or plain Vanilla JS with a focus on minimal dependencies to ensure "offline" capability where possible.

Routing: Client-side routing manages the state between "Log," "Mint," and "Burn" views without refreshing the page, maintaining the "app-like" feel.

### Data Handling Patterns

Client-Side Hashing: This is the most critical architectural pattern. The use of the crypto.subtle API (native browser cryptography) or a library like crypto-js ensures that hashing is performant and secure. The raw data payload is processed in-memory and discarded; it is never serialized to a database controlled by the developer.

Stateless Operation: The app does not appear to use a backend database (like Firebase or SQL) to store user sessions or history. The "History" shown to the user is likely ephemeral (cleared on refresh) or fetched directly from the Hedera network using the user's account ID.

### State Management

Network as State: The "truth" of the application state (e.g., Token Supply, Log History) is derived entirely from the Hedera network. The frontend acts as a "View" layer for the distributed "Model" that is the ledger.

Local State: React state (or equivalent) handles the form inputs and temporary UI states (loading spinners, error messages).

### Performance Considerations

Latency Masking: The 3-5 second consensus time of Hedera is handled via optimistic UI updates or clear "Pending" states. The app does not block the main thread while waiting for the network; it likely uses Javascript Promises/Async-Await patterns to handle the network request asynchronously.

Payload Size: Since only hashes are sent to the network, the bandwidth usage is extremely low. This ensures the app is responsive even on poor mobile connections.

### "Not Exposed in UI"

Private Key Management: The specific mechanism for signing transactions is abstracted. It is not immediately visible if the app uses a hardcoded backend wallet (for the demo) or connects to a user's browser wallet (like HashPack). Given the "Hackathon Starter" origins , it is inferred to use a backend .env driven wallet for ease of demo, which acts as a "Gas Station" for users.

## Tradeoffs & Limitations

### 1. The "Oracle" Problem (Validity vs. Integrity)

Limitation: Alibi can prove that data was logged at a specific time, but it cannot prove that the data is true. If a user logs a fake invoice, Alibi will faithfully record the fake invoice forever. The system provides "Garbage In, Immutable Garbage Out." Tradeoff: The app intentionally trades validity for integrity. Validating the real-world truth of data (e.g., did the shipment actually arrive?) requires IoT sensors or third-party auditors, which is out of scope. Alibi focuses solely on the digital integrity of the record provided.

### 2. Centralized Paying Authority (The Faucet Risk)


### 3. Privacy of Metadata (Traffic Analysis)

Limitation: While the content is private (hashed), the activity is public. Anyone monitoring the specific Topic ID on Hedera can see that something is being logged, and they can see the volume and frequency of activity. An observer could infer business volume based on the number of logs. Tradeoff: Total privacy (e.g., utilizing Zero-Knowledge Proofs or Private permissioned networks) adds significant computational complexity and latency. Alibi accepts metadata leakage to achieve the speed and transparency benefits of a public ledger.

### 4. Searchability and Indexing

Limitation: The Hedera ledger is not a queryable database in the traditional sense. You cannot efficiently run a query like "Select all invoices where amount > 500." You can only retrieve messages by sequence number or know the specific transaction ID. Tradeoff: The system is designed for Verification, not Discovery. It assumes the user already possesses the record and wants to check it, rather than browsing the history to find it. This simplifies the backend architecture significantly.

## Current State Assessment

### Solidity: The Core Loop

The core verification loop (Input -> Hash -> Anchor -> Verify) feels solid and production-grade in its logic. The underlying cryptography (SHA-256) and network (Hedera) are industry standards. The integration with HashScan provides a robust "fallback" UI that makes the system feel complete even if the app's own UI is minimal.

### Evolving: The Tokenomics and Identity

The "Mint" and "Burn" features , while functional, feel more experimental. The connection between the "Log" (the invoice data) and the "Token" (the value) is likely loose—tied perhaps only by convention or a metadata field. In a production scenario, these would need to be tightly coupled via Smart Contracts to ensure that the token is the invoice legally. Furthermore, the lack of user authentication (DID) means we know when something was logged, but not necessarily who logged it (other than the app's generic account).



## Future Iterations

### 1. Identity Integration (Decentralized Identifiers - DID)

A logical next step is integrating W3C Decentralized Identifiers (DIDs). Currently, the "Logger" is an anonymous key. Integrating a DID would allow the app to cryptographically sign the log with the user's specific identity, proving who logged it, not just when it was logged. This would move the system from "Anonymous Notary" to "Identity-Bound Attribution."

### 2. Encryption Layer for Data Recovery

To solve the problem of "losing the original file," a future version could include client-side encryption of the payload. The encrypted blob could be stored on a decentralized storage network (like IPFS or Filecoin), with only the content ID (CID) and the hash anchored on Hedera. This would allow the user to recover the data later, provided they still hold the decryption key.

### 3. Smart Contract Escrow

For the "Mint" feature, moving from simple HTS tokens to Smart Contract-managed assets would allow for automated settlement. For example, a contract could hold the "Invoice Tokens" in escrow and automatically "burn" them when a stablecoin payment is detected on the network. This would create a truly trustless "Delivery vs. Payment" (DvP) system.

### 4. Enterprise API Gateway

Developing a robust API wrapper would allow companies to integrate Alibi directly into their existing ERP systems (like SAP or Oracle). Instead of manually pasting JSON into a web UI, their systems could automatically log every invoice generated via Alibi's API, creating an invisible, automated audit trail.

## Key Takeaways

### Demonstrating Systems Thinking

Alibi — Logged & Verified showcases a developer who looks beyond the "Frontend/Backend" dichotomy. It demonstrates a deep understanding of distributed systems, consensus mechanisms, and state immutability. The choice of Hedera over a standard SQL database signals an ability to select the right tool for specific constraints (trust/auditability) rather than defaulting to the standard MERN stack.

### Frontend as a Trust Interface

The app highlights a specific, high-value UX skill: abstracting complexity. The developer has taken a hostile, technical backend (a distributed ledger) and created a frontend that makes it approachable without dumbing it down. This balance—respecting the user's intelligence while minimizing their cognitive load—is a hallmark of senior product design.

### Maturity in Tradeoffs

The explicit decision to rely on an external explorer (HashScan) for verification rather than rebuilding a block explorer inside the app demonstrates resource pragmatism. It shows a developer who knows where to focus their effort (the creation flow) and where to leverage existing ecosystem tools (the verification flow). This is the kind of judgment that technical recruiters and engineering directors look for: the ability to build smart, not just hard.

## Appendix

### Terminology

Hash (SHA-256): A one-way mathematical function that converts any input data into a unique fixed-size string (fingerprint). Changing a single comma in the input changes the entire hash.

Anchor: The act of storing a hash on the public ledger.

Topic ID: A specific address on the Hedera network where messages are grouped (analogous to a folder or channel).

HCS (Hedera Consensus Service): The network layer responsible for ordering and timestamping messages.

HTS (Hedera Token Service): The network layer responsible for minting, transferring, and burning native tokens.

Mirror Node: A node that stores the history of the ledger and allows for querying of past transactions.

### Data Entities (Inferred)

Invoice Payload (JSON):

{
  "invoiceId": "INV-1001",
  "issuer": "Observint Technologies",
  "recipient": "Client B",
  "amount": 1500.00,
  "currency": "USD",
  "lineItems": ["Consulting", "Audit"],
  "date": "2026-02-07"
}

Ledger Message Structure:

{
  "hash": "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
  "meta": "Invoice-Anchor-v1",
  "timestamp": "1675700000.000001"
}

### Usage Notes

The application requires a network connection to anchor and verify data but performs payload hashing locally. Users on the Testnet must be aware that the "Burning" of tokens is a simulation of value transfer and does not represent the destruction of real US Dollars.

### Comparative Analysis: Alibi vs. The World

To fully understand the architectural positioning of Alibi, it is helpful to compare it against the prevailing paradigms of data storage and verification.

This table illustrates exactly why Alibi was built on Hedera. It retains the Immutability and Trust Model of a Blockchain but approaches the Speed and Cost profile of a traditional database, while maintaining Privacy through the hashing architecture.

### The Psychology of the "Receipt"

One of the most nuanced aspects of Alibi's design is its handling of the "Receipt." In the physical world, a receipt is a throwaway object. In the digital world of Alibi, the receipt is the product. The application is essentially a "Receipt Factory."

When a user logs an item, the app generates a cryptographic artifact. This artifact—the Transaction ID—is the digital equivalent of a wax seal. The design decision to make this artifact copyable, clickable, and verifiable is what gives the application its "weight." It transforms the ephemeral act of "clicking a button" into the permanent act of "notarizing a document." This shift in user psychology—from active creator to passive witness—is what separates Alibi from a standard CRUD (Create, Read, Update, Delete) application. Alibi is a CR (Create, Read) application. The "Update" and "Delete" verbs are intentionally removed from the vocabulary of the system, enforcing a discipline of honesty that is rare in software design.

#### Works cited

1. TheodorNEngoy/crediproof-hedera-starter - GitHub, https://github.com/TheodorNEngoy/crediproof-hedera-starter 2. Bytes and Rights - Ebook | PDF | Justice | Crime & Violence - Scribd, https://www.scribd.com/document/923116163/Bytes-and-Rights-eBook 3. Show us what you're building with the ChatGPT Apps SDK - OpenAI Developer Community, https://community.openai.com/t/show-us-what-you-re-building-with-the-chatgpt-apps-sdk/1365862?page=3
