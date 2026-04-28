## Plan: Add "Monthly In-Service Training" Track for Miracle Grow

Create a new training track with 12 monthly modules, each containing one ProCare external training link requiring certificate upload.

### Tenant
- **Miracle Grow** (`f4e0c94e-56f5-41d0-9bc3-f403524474a5`)

### Track
- **Title**: Monthly In-Service Training
- **auto_assign**: true
- **is_priority**: false
- **certificate_enabled**: true
- **is_active**: true

### Modules (12, ordered Jan→Dec)

| # | Module | External Training Title | URL |
|---|---|---|---|
| 1 | Jan | Classroom Management | procareprofessionaldevelopment.com/course/classroom-mgmt-2 |
| 2 | Feb | Behavior Guidance | .../course/behavior-communication |
| 3 | Mar | Curriculum / Lesson Planning | .../course/curriculum |
| 4 | Apr | Parent Engagement | .../course/building-trust-with-parents-through-engagement |
| 5 | May | Family Style Dining | .../course/family-style-dining |
| 6 | Jun | Observing, Assessing, and Documenting | .../course/dapobservation |
| 7 | Jul | Creating Smooth Transitions | .../course/transitions-music-movement |
| 8 | Aug | Environment | .../course/environment |
| 9 | Sep | Sensitive Conversations | .../course/navigating-sensitive-conversations |
| 10 | Oct | Trauma Informed Strategies | .../course/trauma-informed-strategies |
| 11 | Nov | Self Regulation and Self Esteem | .../course/teaching-self-regulation-and-self-esteem |
| 12 | Dec | Disease Prevention | .../course/stop-the-spread-germs |

### External Training Items
Each module gets one entry in `module_external_trainings`:
- `requires_certificate`: **true** (paid ProCare courses, matching prior decision)
- `is_required`: true
- `order_index`: 0

### Implementation
Single SQL insert (data only, via insert tool — no schema change needed):
1. INSERT into `training_tracks` (returning id)
2. INSERT 12 rows into `modules` (one per month, order_index 0–11)
3. INSERT 12 rows into `module_external_trainings`

All rows tagged with `tenant_id = f4e0c94e-56f5-41d0-9bc3-f403524474a5`.

No code/UI changes required — the existing AdminContent and staff Training pages will display the new track automatically.