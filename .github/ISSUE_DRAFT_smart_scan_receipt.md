# Smart Scan Receipt - AI-Powered Receipt Scanning Feature

**Labels**: `enhancement`
**Priority**: High
**Effort**: Medium (2-3 weeks for MVP Phase 1)

---

## Feature Description

**Smart Scan Receipt** - AI-powered receipt scanning to automatically extract transaction details from receipt images and populate the expense entry form.

Users can capture or upload receipt photos, and the system will use OCR/Vision AI to extract key information (amount, date, merchant, items) and intelligently pre-fill the transaction form. This reduces manual data entry time from ~2 minutes to ~10 seconds, improving the daily expense tracking experience.

## Why is this needed?

**Problem:**
- Manual transaction entry is time-consuming and error-prone
- Users often delay logging expenses, leading to forgotten transactions
- Typing on mobile keyboards is cumbersome for on-the-go expense tracking
- Receipt details (amount, date, merchant) are already printed - why type them again?

**Use Cases:**
1. **Daily Expense Tracking**: Quickly log grocery shopping, dining, transportation after purchase
2. **Business Expenses**: Scan and categorize work-related receipts for reimbursement
3. **Travel Logging**: Capture foreign currency receipts with automatic conversion detection
4. **Bulk Entry**: Process a stack of receipts at month-end in minutes instead of hours
5. **Family Sharing**: Non-technical family members can easily log expenses via simple photo capture

**Impact:**
- **80% reduction in data entry time** (2 min → 10 sec per transaction)
- **Increased compliance**: Users are more likely to log all expenses when it's frictionless
- **Better accuracy**: OCR reduces typos in amounts and dates
- **Competitive differentiation**: Modern AI-powered UX vs traditional manual entry apps

## User Stories

### Epic: Smart Scan Receipt

---

### User Story 1: Basic Receipt Scan (MVP)

**As a** mobile user tracking daily expenses
**I want to** scan a receipt photo and have the transaction form auto-filled
**So that** I can log expenses in 10 seconds instead of 2 minutes

**Acceptance Criteria:**
- ✅ Scan button is visible on expense modal (create mode only)
- ✅ Clicking scan button opens camera (mobile) or file picker (desktop)
- ✅ User can capture photo or upload image (JPG, PNG, max 10MB)
- ✅ Loading indicator shows "Analyzing receipt..." during processing
- ✅ Successfully extracted data auto-fills form fields: amount, date, description (merchant)
- ✅ Category field shows AI-suggested category (user can change)
- ✅ Currency auto-detected from receipt or defaults to user's primary currency
- ✅ User can review and edit all fields before submitting
- ✅ If scan fails, form remains empty with helpful error message
- ✅ Error messages are actionable: "Unable to detect amount. Please enter manually."

**Technical Notes:**
- Use Anthropic Claude Vision API (via Messages API) for image analysis
- Prompt engineering: Extract amount, date, merchant, line items, currency
- Fallback: If API fails, show toast error and keep modal open for manual entry
- Image upload via File API → Base64 encode → Send to Vision API
- Response parsing: JSON structured output for reliable extraction

---

### User Story 2: Multi-Currency Receipt Detection

**As a** user who travels or shops in multiple currencies
**I want to** scan receipts in IDR, USD, or other currencies and have them auto-detected
**So that** I don't have to manually switch currency dropdown every time

**Acceptance Criteria:**
- ✅ Vision AI detects currency from receipt (IDR, USD, EUR, SGD, etc.)
- ✅ Currency field auto-selects detected currency
- ✅ If currency not detected, defaults to user's primary currency (workspace setting)
- ✅ Toast notification confirms detected currency: "Detected USD receipt"
- ✅ User can override detected currency before submitting
- ✅ Exchange rate conversion happens at save time (existing logic)

---

### User Story 3: Smart Category Suggestion

**As a** user with 20+ expense categories
**I want to** receive intelligent category suggestions based on merchant and items
**So that** I don't have to scroll through a long dropdown every time

**Acceptance Criteria:**
- ✅ AI analyzes merchant name and line items to suggest category
- ✅ Category field pre-selects suggested category (e.g., "Food & Groceries" for supermarket)
- ✅ Suggestion logic uses user's existing categories (not hallucinated categories)
- ✅ If confidence is low, category field remains blank (user selects manually)
- ✅ Learning improvement (Phase 2): Track user corrections to improve future suggestions

**Examples:**
- "Alfamart" → Food & Groceries
- "Grab" → Transportation
- "Netflix" → Subscription / Entertainment
- "Starbucks" → Dine Out

---

### User Story 4: Batch Receipt Processing (Phase 2)

**As a** user who collects receipts throughout the month
**I want to** upload multiple receipts at once and process them as a batch
**So that** I can clear my receipt backlog in one session

**Acceptance Criteria:**
- ✅ User can select multiple images (up to 10) from file picker
- ✅ Progress indicator shows "Processing 3 of 10 receipts..."
- ✅ Each extracted transaction appears in a review queue
- ✅ User can bulk approve or individually edit before saving
- ✅ Failed scans are flagged for manual entry
- ✅ Batch save creates all approved transactions at once

---

### User Story 5: PDF Receipt Support (Phase 2)

**As a** user who receives digital receipts (email, e-commerce)
**I want to** upload PDF receipts and have them scanned
**So that** I can process both physical and digital receipts the same way

**Acceptance Criteria:**
- ✅ File picker accepts PDF files (max 5MB)
- ✅ First page of PDF is analyzed (multi-page support in future)
- ✅ Extraction works the same as image receipts
- ✅ Error message if PDF is text-only (no scanned image): "PDF text extraction not yet supported. Please upload an image."

---

### User Story 6: Scan History and Re-processing (Phase 2)

**As a** user who wants to audit my scanned receipts
**I want to** see a history of scanned images linked to transactions
**So that** I can verify accuracy and re-scan if needed

**Acceptance Criteria:**
- ✅ Each scanned transaction stores original receipt image
- ✅ Transaction detail view shows thumbnail of scanned receipt
- ✅ User can click thumbnail to view full-size image
- ✅ "Re-scan" button allows re-processing if original scan was incorrect
- ✅ Image storage uses object storage (S3, R2, or local filesystem for MVP)
- ✅ Images are workspace-scoped (not accessible across workspaces)

---

### User Story 7: Error Handling and Edge Cases

**As a** user scanning low-quality or ambiguous receipts
**I want to** receive clear guidance when scan fails or is incomplete
**So that** I know what to do next without frustration

**Acceptance Criteria:**
- ✅ Blurry image: "Image quality too low. Please retake photo in good lighting."
- ✅ No receipt detected: "No receipt found. Please ensure receipt is visible and try again."
- ✅ Partial extraction (amount only): Auto-fill amount, show info message "Could not detect date or merchant. Please fill manually."
- ✅ API timeout: "Scan taking longer than expected. You can continue manually or try again."
- ✅ API rate limit: "Too many scans in progress. Please wait a moment and try again."
- ✅ All errors allow user to proceed with manual entry (no dead-end)

---

### User Story 8: Accessibility and Keyboard Navigation

**As a** keyboard user or screen reader user
**I want to** access scan functionality via keyboard and receive proper feedback
**So that** I can use the feature without a mouse or visual interface

**Acceptance Criteria:**
- ✅ Scan button is keyboard accessible (Tab + Enter)
- ✅ ARIA labels: "Scan receipt to auto-fill form"
- ✅ Screen reader announces scan progress: "Analyzing receipt, please wait"
- ✅ Screen reader announces extracted data: "Amount 250,000 IDR detected. Category Food & Groceries suggested."
- ✅ Focus management: After scan completes, focus moves to first editable field (amount or category)

---

### User Story 9: Mobile Camera Optimization

**As a** mobile user capturing receipts in real-time
**I want to** use my phone's camera with helpful guides
**So that** I can capture clear, scannable receipt photos every time

**Acceptance Criteria:**
- ✅ Camera opens in full-screen mode with capture button
- ✅ Visual overlay guides (e.g., "Align receipt within frame")
- ✅ Auto-focus and exposure adjustment (native camera features)
- ✅ Option to use front or rear camera (default: rear)
- ✅ "Retake" option if photo is blurry or misaligned
- ✅ Captured photo preview before submitting for analysis

---

### User Story 10: Privacy and Security

**As a** privacy-conscious user
**I want to** ensure my receipt images and data are handled securely
**So that** I trust the app with sensitive financial information

**Acceptance Criteria:**
- ✅ Receipt images are transmitted via HTTPS to Vision API
- ✅ Images are not stored permanently by the Vision API (Anthropic policy: no training on API data)
- ✅ Local image storage (if enabled) is workspace-scoped and encrypted
- ✅ Users can disable scan feature in settings (fallback to manual entry)
- ✅ Privacy notice on first scan: "Receipt images are processed by Anthropic Claude Vision AI and not used for training."
- ✅ GDPR compliance: Users can request deletion of all stored receipt images

---

## Additional Notes

### Implementation Phases

**Phase 1 (MVP):**
- User Stories 1-3: Basic scan, multi-currency, smart category
- Single image upload/camera capture
- Form auto-fill with extracted data
- Error handling and fallback to manual entry

**Phase 2 (Enhanced):**
- User Stories 4-6: Batch processing, PDF support, scan history
- Image storage and thumbnail display
- Re-processing capability

**Phase 3 (Advanced):**
- User Stories 7-10: Accessibility, mobile optimization, privacy controls
- Learning from user corrections
- Multi-language receipt support (Indonesian, English, etc.)

### Technology Stack

- **Vision AI**: Anthropic Claude 3.5 Sonnet (Vision API via Messages API)
- **Image Capture**: HTML5 File API + Media Capture API (mobile)
- **Image Upload**: FormData multipart/form-data
- **Storage (Phase 2)**: Cloudflare R2, AWS S3, or local filesystem (dev)
- **Client-side**: TypeScript + Astro components + Web APIs
- **Server-side**: Bun + Anthropic SDK

### API Cost Estimate

- Claude 3.5 Sonnet Vision: ~$3 per 1000 images (typical receipt: 1 image = 1 scan)
- For 100 scans/month: ~$0.30/month per active user
- Caching extracted data reduces repeat processing

### Design System Integration

- Follow mobile-first responsive design (CLAUDE.md)
- Use DaisyUI components (Button, Modal, Input)
- Design tokens for spacing, colors, typography
- Accessibility: WCAG 2.1 Level AA compliance
- Motion library for loading animations

### Related Features

- MCP Server (docs/architecture/010-mcp-server-architecture.md): Future integration for AI assistant-driven scanning
- CSV Import: Similar batch processing UX patterns
- Asset Management: Potential future use for scanning bank statements

### Open Questions

1. Should we support itemized line items extraction (split one receipt into multiple transactions)?
2. Do we need offline mode (capture photo, queue for processing when online)?
3. Should we integrate with email inbox for automatic digital receipt processing?
4. What's the retention policy for scanned images (30 days, 1 year, forever)?

---

## Implementation Checklist (Phase 1 MVP)

### Backend
- [ ] Create receipt scanning API endpoint (`POST /api/receipts/scan`)
- [ ] Integrate Anthropic Claude Vision API
- [ ] Implement prompt engineering for receipt extraction
- [ ] Add JSON schema validation for extracted data
- [ ] Implement error handling and fallback logic
- [ ] Add rate limiting for scan requests
- [ ] Create receipt data parser service

### Frontend
- [ ] Update TransactionModal scan button handler
- [ ] Implement image upload UI (file picker + camera)
- [ ] Add image preview before scan
- [ ] Create loading state "Analyzing receipt..."
- [ ] Implement form auto-fill with extracted data
- [ ] Add category matching logic (map merchant to existing categories)
- [ ] Create error handling UI with actionable messages
- [ ] Add success toast with detected currency
- [ ] Ensure mobile responsive design
- [ ] Add ARIA labels for accessibility

### Testing
- [ ] Unit tests for receipt parser
- [ ] Integration tests for scan API endpoint
- [ ] E2E tests for scan flow (mock API)
- [ ] Manual testing with real receipts (IDR, USD)
- [ ] Mobile device testing (iOS, Android)
- [ ] Accessibility testing (keyboard, screen reader)

### Documentation
- [ ] Update OpenAPI specification
- [ ] Add API documentation for scan endpoint
- [ ] Update user guide with scan feature
- [ ] Document privacy policy for image processing
- [ ] Add architecture decision record (ADR)

### Deployment
- [ ] Add ANTHROPIC_API_KEY to environment variables
- [ ] Configure API rate limits
- [ ] Set up monitoring for scan endpoint
- [ ] Add error tracking for failed scans
- [ ] Update privacy policy on production

---

**Dependencies**:
- Anthropic API access (API key required)
- Image upload infrastructure
- Environment variable: `ANTHROPIC_API_KEY`

**Priority**: High (differentiator feature, high user value)
**Effort**: Medium (2-3 weeks for MVP Phase 1)
