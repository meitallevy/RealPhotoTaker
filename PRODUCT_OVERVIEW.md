# PackageGuard: Product Overview for Market Research

**PackageGuard** is a tamper-evident evidence capture and dispute resolution platform enabling e-commerce businesses to collect cryptographically signed photo evidence from customers during package delivery, creating immutable audit trails for order disputes, damage claims, and delivery verification.
The system operates as a two-sided marketplace connecting sellers (merchants) with buyers (end customers) through a mobile-first Android application and cloud-based processing infrastructure that handles evidence validation, cryptographic signing, and seller workflow management.

**Target Users**: Sellers are e-commerce businesses, logistics companies, and marketplace platforms that register accounts and receive unique seller IDs.
Buyers are end customers who use the mobile app without registration to photograph packages upon receipt.

**Pricing Model**: Sellers purchase subscription plans that limit the number of claims they can process per day, per month, or in total, with plan tiers including trial (5/day, 30/month, 100 total), small (20/day, 200/month), pro (100/day, 1000/month), business (500/day, 5000/month), and ultra (unlimited).
The system enforces plan limits and blocks new claim creation when daily, monthly, or total limits are reached.

**Usage Model**: Sellers register accounts, receive unique seller IDs, configure notification preferences (email/webhook), and access dashboards showing claim statistics.
Buyers enter a seller ID and order reference to initiate a claim, receive a time-limited nonce code, follow guided photo capture workflows, upload evidence photos with metadata, and submit buyer notes.
The system processes uploaded evidence through optional AI-powered image authenticity analysis, generates cryptographic signatures, produces verifiable PDF reports, and notifies sellers.
Sellers view claim lists, open individual claims to see evidence photos and metadata, and review claims to approve, reject, or request additional evidence.

**Evidence Capture**: The system automatically captures precise timestamps, device attestation tokens, EXIF metadata from photos, file hashes for each uploaded image, and sequence numbers for multiple photos, storing evidence photos in cloud storage with file paths, hashes, and metadata recorded in a database.

**Claim Processing**: After buyers complete evidence upload, the system processes claims asynchronously through AI image analysis (if enabled), manifest generation, cryptographic signing, PDF report generation, seller notification, and status updates, with claims progressing through statuses: PENDING (initialized), UPLOADING (evidence being uploaded), PROCESSING (post-upload processing), COMPLETED (ready for seller review), FAILED (processing error), or EXPIRED (nonce expired).
