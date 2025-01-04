# Telloom Attachments PRD

## 1. Objective

Allow Sharers on **Telloom** to upload and manage files (images—including **HEIC**—or PDFs) associated with their **Prompt Responses**, providing additional context and storytelling. Sharers may optionally add metadata—such as title, description, date (or approximate year)—and tag people (by name and relationship) who appear in the files. **HEIC** images will be **automatically converted to JPEG** for compatibility. All files will be stored in a dedicated **Supabase storage bucket** named `"attachments"`. Additionally, each file’s name will be auto-updated to reflect the **Sharer first and last name**, **topic** name, and an **image number** for that topic.

---

## 2. Scope & Features

1. **Multiple File Attachment (Images, HEIC, & PDFs)**
   - Sharers can upload **one or more** files:
     - **JPEG**, **PNG**, **WEBP**, **HEIC**, or **PDF**.
   - **HEIC** files (from Apple devices) are automatically **converted** to **JPEG** before storage or serving.
   - Each file is associated with a **PromptResponse** record in the database.
   - Files are stored in the **Supabase** storage bucket named `"attachments"`, with metadata in the `PromptResponseAttachment` table.

2. **Metadata Fields**
   - **Title** (short, optional)
   - **Description** (long text, optional)
   - **Date/Year**
     - Users can enter an **exact date** (day/month/year) if known, or just an **approximate year**, or leave it blank.
     - The database stores these in `dateCaptured` (DATE) and `yearCaptured` (INTEGER) columns.

3. **Optional Person Tagging**
   - Sharers may attach zero or multiple **Person Tags** to each file.
   - Each tag has:
     1. **Name** (e.g., “Grandma Lucy”)
     2. **Relation** (drawn from an ENUM list; see Section 8 below).
   - These tags are stored in the `PersonTag` table, scoped to each Sharer (via `profileSharerId`).
   - A join table, `PromptResponseAttachmentPersonTag`, links tags to attachments.

4. **File Name Convention**
   - When a user uploads an attachment, the system auto-generates a final storage name based on:
     1. The **Sharer username** (e.g., `johndoe`).
     2. The **Topic** name (e.g., `"Entrepreneurship"`).
     3. A numeric index or unique ID (e.g., `001`, `002`, etc.).
   - An example final file name might be:  
     ```
     johndoe_Entrepreneurship_001.jpg
     johndoe_Entrepreneurship_002.jpg
     ```
     or  
     ```
     johndoe_Entrepreneurship_001.pdf
     ```
   - This rename step occurs during or right after the file is successfully uploaded/conversion is complete. 

5. **Viewing Attachments at the Topic Level**
   - On the topic page, Sharers see which **Prompt Responses** have attachments.
   - Clicking “View Attachments” opens a **carousel** or **gallery** for images, or a preview/link for PDFs.
   - Metadata (title, description, date/year, person tags) is displayed in the viewer.

6. **Integration with Existing Video Response Flow**
   - A new **“Add Attachment”** button (or similar) is placed near the video record/upload controls.
   - Follows existing modal/popup design patterns (e.g., `VideoPopup`, `UploadPopup`) for consistency.

---

## 3. User Stories

1. **Upload Mixed File Types (Including HEIC)**
   > As a Sharer, I want to attach images (JPEG, PNG, WEBP, **HEIC**) or PDFs to my prompt response. If I upload a HEIC image, the system automatically converts it to JPEG so it’s viewable on all devices.

2. **Add Optional Metadata**
   > As a Sharer, I can add a title, description, and date or year if known. If I don’t know the exact date, I can leave it blank or just specify the year.

3. **Optional Person Tagging**
   > As a Sharer, I may or may not choose to tag the individuals in the file. If I do, I can select from existing tags or create new ones specifying both name and relationship.

4. **Viewing Attachments**
   > As a viewer (with the right permissions), I want to browse all attachments for a given prompt in an easy-to-use carousel or gallery, seeing relevant metadata.

5. **Partial Date Support**
   > As a Sharer, I want the flexibility to record just the year, a full date, or no date, because I might only know an approximate timeframe.

6. **HEIC Conversion**
   > As a Sharer, if I upload a HEIC photo, I want the system to handle conversion behind the scenes, so I don’t have to manually convert it.

7. **Supabase Storage Bucket & File Naming**
   > As a Sharer, I want confidence that all attached files are stored in the **"attachments"** bucket on Supabase, and that each file name is auto-generated to include my username, the topic name, and a numeric index (e.g., `johndoe_Entrepreneurship_1.jpg`).

---

## 4. Data Model Updates

### 4.1 Tables & Fields

#### **`PromptResponseAttachment`** (existing + new columns)

| Field                 | Type        | Description                                                                 |
|-----------------------|------------|-----------------------------------------------------------------------------|
| `id`                  | UUID (PK)   | Primary key (auto-generated).                                              |
| `promptResponseId`    | UUID (FK)   | Links to `PromptResponse.id`.                                              |
| `profileSharerId`     | UUID (FK)   | Links to `ProfileSharer.id`.                                               |
| `fileUrl`             | String      | Path/URL in the Supabase `"attachments"` bucket (e.g., `attachments/...`). |
| `fileType`            | String      | MIME type (e.g., `"image/jpeg"`, `"application/pdf"`).                     |
| `fileName`            | String?     | Auto-generated final filename, e.g., `johndoe_Entrepreneurship_1.jpg`.     |
| `fileSize`            | Int?        | Size in bytes (optional).                                                  |
| `title`               | String?     | Short, user-defined label (optional).                                      |
| `description`         | String?     | Longer, user-defined description (optional).                               |
| `dateCaptured`        | Date?       | Exact date (if known).                                                     |
| `yearCaptured`        | Int?        | Only a year (if full date is unknown).                                     |
| `uploadedAt`          | Timestamptz | Defaults to `now()`.                                                       |

#### **`PersonTag`** (new)

| Field               | Type                     | Description                                                                |
|---------------------|--------------------------|----------------------------------------------------------------------------|
| `id`                | UUID (PK)               | Primary key (auto-generated).                                              |
| `name`              | String                  | Name of the person, e.g., "Lucy Smith".                                    |
| `profileSharerId`   | UUID (FK)               | Links to `ProfileSharer.id`, ensuring tags are unique per Sharer.          |
| `relation`          | `person_relation` (ENUM) | Relationship type, e.g., "Mother", "Grandson", "Friend", etc. (see below). |
| `createdAt`         | Timestamptz             | Defaults to `now()`.                                                       |
| `updatedAt`         | Timestamptz             | Defaults to `now()`.                                                       |

#### **`PromptResponseAttachmentPersonTag`** (new, join table)

| Field                          | Type        | Description                                               |
|--------------------------------|------------|-----------------------------------------------------------|
| `id`                           | UUID (PK)   | Primary key (auto-generated).                             |
| `promptResponseAttachmentId`   | UUID (FK)   | Links to `PromptResponseAttachment.id`.                   |
| `personTagId`                  | UUID (FK)   | Links to `PersonTag.id`.                                  |
| `createdAt`                    | Timestamptz | Defaults to `now()`.                                      |
| `updatedAt`                    | Timestamptz | Defaults to `now()`.                                      |

---

## 5. Workflow & UI Flow

1. **Add File Attachments**
   1. Sharer clicks “Add Attachment” on a prompt response detail page.
   2. A modal/drawer opens, allowing multiple file uploads.
   3. The user optionally enters **title**, **description**, **dateCaptured** (day/month/year) or just **yearCaptured**.
   4. Tagging is optional. The Sharer can skip or add existing/new tags.
   5. The backend:
      - **If a file is HEIC**, convert it to **JPEG** before storage.
      - Generates a final **file name** using `{username}_{topic}_{imageNumber}.{ext}`.  
        Example: `janedoe_Entrepreneurship_2.jpg`
      - Uploads the file to the Supabase `"attachments"` bucket.
      - Inserts metadata in `PromptResponseAttachment`.
      - Links any chosen tags with `PromptResponseAttachmentPersonTag`.

2. **Viewing Attachments**
   - The topic page or prompt detail page shows an icon or attachment count if any exist.
   - Clicking “View Attachments” opens a **carousel** (for images) and a link/icon for PDFs.
   - Each attachment’s **title**, **description**, **date/year** info, and **tagged people** appear in the viewer.

3. **Editing & Deleting Attachments**
   - Only the Sharer can edit metadata or remove attachments.
   - Deleting an attachment also removes references in `PromptResponseAttachmentPersonTag`.

4. **Permissions**
   - **Listeners** only see attachments if the prompt response is viewable to them under privacy settings.

---

## 6. API & Frontend Requirements

### 6.1 Backend Endpoints

1. **Upload Attachments**
   - `POST /api/attachments/upload`
   - Accepts `{ promptResponseId, files[], metadata }`.
   - Validates file type, size, etc.
   - **If `fileType` is HEIC**, convert to JPEG, set `fileType = "image/jpeg"`.
   - Auto-generate a final `fileName` using `"{username}_{topic}_{imageNumber}.{ext}"`.
   - Upload to `"attachments"` bucket.

2. **Create/Update Person Tags**
   - `POST /api/person-tags`
   - If a same-name tag for that Sharer exists, reuse it; otherwise create a new one with `relation`.

3. **Link Person Tags to Attachments**
   - `POST /api/attachments/:attachmentId/tags`
   - Creates rows in `PromptResponseAttachmentPersonTag`.

4. **Fetch Attachments**
   - `GET /api/responses/:promptResponseId/attachments`
   - Returns attachments joined with their person tags.

### 6.2 Frontend Components

- **Attachment Modal**  
  - Multi-file drag-and-drop, progress indicators.
  - Title, description, date/year fields.
  - Optional tagging UI (select existing tags or create new).
  - On “Save,” calls the `upload` endpoint, then tagging endpoints if needed.

- **Attachment Viewer**  
  - Carousel for images (including converted HEIC → JPEG).
  - PDF icon or inline preview.
  - Shows metadata (title, description, date/year) and tags.

- **Tagging UI**  
  - Autocomplete from existing `PersonTag` for that Sharer.
  - If new, user enters **name** + picks **relation**.
  - Saves references in the join table.

---

## 7. Acceptance Criteria

1. **Mixed File Types (With HEIC Conversion)**
   - [ ] Supports JPEG, PNG, WEBP, **HEIC** (converted to JPEG), and PDF.
   - [ ] All files are stored in the Supabase **`"attachments"`** bucket.
   - [ ] Successfully saves metadata in `PromptResponseAttachment`.
   - [ ] If uploading HEIC, user ends with a final `.jpeg` in storage.

2. **Auto-Generated File Names**
   - [ ] Each uploaded file is renamed to `"{username}_{topic}_{imageNumber}.{ext}"`.
   - [ ] The system increments `imageNumber` or ensures a unique index if multiple attachments are uploaded for the same topic.
   - [ ] The final name is stored in `PromptResponseAttachment.fileName`.

3. **Optional Metadata**
   - [ ] Title, description, dateCaptured, and yearCaptured can be filled or omitted.
   - [ ] If user only sets `yearCaptured`, store that; if user sets a full date, store `dateCaptured`.

4. **Optional Tagging**
   - [ ] Zero or multiple tags can be attached to each file.
   - [ ] Each tag references a `PersonTag` with `name` and `relation`.
   - [ ] `relation` uses an ENUM (see Section 8).
   - [ ] No forced tagging requirement.

5. **Viewing**
   - [ ] A carousel for images, PDF links or inline previews for documents.
   - [ ] Shows relevant metadata (title, date/year, tags).
   - [ ] Matches existing UI style.

6. **HEIC → JPEG Conversion**
   - [ ] System automatically converts HEIC to JPEG before storage.
   - [ ] No manual action by the user is needed.

7. **Security & Permissions**
   - [ ] Only the Sharer who owns the `PromptResponse` can manage attachments.
   - [ ] Listeners can view attachments if permitted by privacy settings.

8. **Performance & Reliability**
   - [ ] File size limits are enforced.
   - [ ] Large images may be compressed/resized if needed.
   - [ ] UI remains responsive, showing progress for conversions/uploads.

---

## 8. Extended Relationship ENUM

Below is the **`person_relation`** ENUM, including various family and non-family relationships. You may add/remove items as needed:Spouse
Partner
Mother
Father
Sister
Brother
Daughter
Son
Grandmother
Grandfather
GreatGrandmother
GreatGrandfather
Granddaughter
Grandson
GreatGranddaughter
GreatGrandson
Aunt
Uncle
GreatAunt
GreatUncle
Niece
Nephew
Cousin
Friend
Coworker
Mentor
Teacher
Boss
MotherInLaw
FatherInLaw
SisterInLaw
BrotherInLaw
StepMother
StepFather
StepSister
StepBrother
StepDaughter
StepSon
Godmother
Godfather
Godchild
Other---

## 9. Technical Considerations

1. **Supabase Storage Bucket**
   - All attachments reside in a single bucket named **`attachments`**.
   - Files may be organized by `profileSharerId` and `promptResponseId` (e.g., `attachments/{profileSharerId}/{promptResponseId}/{filename}`).

2. **File Naming Convention**
   - The system must rename the file to `"{username}_{topic}_{imageNumber}.{ext}"`.
   - Ensure that `imageNumber` is incremented or unique for each new attachment in that topic.

3. **Partial Dates**
   - If only a year is known, store in `yearCaptured`.
   - If a full date is known, use `dateCaptured`. Optionally fill `yearCaptured` for searching by year.

4. **HEIC Conversion**
   - Integrate a server-side or client-side library (e.g., **sharp** or **libheif**).
   - Ensure the final file is in `.jpg` or `.jpeg` format, with the MIME type updated to `"image/jpeg"`.

5. **Tagging**
   - Sharers might have many tags. Provide efficient searching in the UI.
   - Tag creation flow must let the user select a `relation` from the ENUM.

6. **Future Enhancements**
   - EXIF data parsing for images (date/time, location).
   - Searching/filtering based on dateCaptured, tags, or descriptions.

7. **Testing**
   - Validate all scenarios: partial vs. full date, no tags vs. many tags, HEIC → JPEG conversion, large PDF uploads, etc.
   - Ensure concurrency is handled when multiple attachments are uploaded simultaneously.

---


## 10. Conclusion

This PRD details how **Telloom** will support uploading mixed file types—including **HEIC** images (converted to JPEG)—and **PDF** documents. Metadata (title, description, date/year) and optional **person tagging** add context to each attachment. Files are stored in the **`attachments`** bucket on Supabase, and each attachment’s filename is auto-generated to reflect the Sharer’s username, topic name, and a numeric index. This ensures consistent naming, easy retrieval, and broad compatibility across devices.