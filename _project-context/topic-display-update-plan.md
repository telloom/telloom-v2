# Plan: Update Topic Display for Listener Role

## 1. Objective

To modify the display name of topics (sourced from the `PromptCategory.category` field) and their descriptions (using the new `PromptCategory.descriptionListener` field) specifically for users in the `LISTENER` role. When a topic name begins with "Your" (e.g., "Your Parents"), it should be displayed as "Their Parents" for Listeners. The `descriptionListener` field provides a pre-formatted description suitable for the Listener's perspective. For `SHARER` and `EXECUTOR` roles, the original "Your" prefix for topic names and the standard `PromptCategory.description` will be retained.

## 2. Background

-   **Topics Data**: Topic names are stored in the `PromptCategory` table, within the `category` column. Topic descriptions are in `PromptCategory.description`, and Listener-specific descriptions are in `PromptCategory.descriptionListener`.
-   **Role-Based Display**:
    -   `SHARER` and `EXECUTOR` roles currently see topic names as they are stored (e.g., "Your Parents"). This is appropriate as they are either the owner or managing on behalf of the owner.
    -   `LISTENER` roles view content shared by a Sharer. Therefore, a topic like "Your Parents" should be rephrased from the Sharer's perspective, becoming "Their Parents" for the Listener.
-   **Reference**: See `_project-context/roles-explanation.md` for details on role definitions and their interactions.

## 3. Affected Areas

This change will primarily affect UI components within the Listener's authenticated section of the application where topic names and descriptions are displayed. This includes, but may not be limited to:
-   Pages under `app/(authenticated)/role-listener/` that list or detail topics.
-   Specifically, if a path like `app/(authenticated)/role-listener/[id]/topics/page.tsx` exists (where `[id]` refers to `sharerId`), this would be a key area.
-   Any shared components that render topic names and descriptions and are used within the Listener view.

## 4. Proposed Solution: Dynamic Transformation in Frontend (React Server Components) and Usage of Dedicated Listener Description Field

We will implement the transformation logic for topic names directly within the React Server Components responsible for rendering topics for the Listener. For topic descriptions, we will utilize the dedicated `descriptionListener` field from the `PromptCategory` table.

-   **Reasoning**:
    -   **Topic Name Transformation**:
        -   **No Database Schema Changes for Name**: This approach avoids altering the `PromptCategory` table for the *name* transformation, which is preferable for a purely presentational change.
        -   **Simplicity**: A simple string replacement ("Your" -> "Their") doesn't warrant database modifications or complex backend logic for the name.
        -   **Contextual Logic**: The name transformation is view-specific and can be neatly handled in the frontend components.
        -   **Alignment with RSC**: React Server Components can prepare data, including such transformations, on the server.
    -   **Topic Description**:
        -   **Dedicated Field**: A new field `descriptionListener` was added to the `PromptCategory` table to store descriptions specifically tailored for the Listener perspective. This avoids complex frontend logic for transforming descriptions and ensures consistency.
        -   **Data Integrity**: Storing Listener-specific descriptions in the database ensures the correct text is always used.

-   **Implementation Details**:
    -   **Topic Names**:
        -   When fetching `PromptCategory` data in a server component for the Listener view:
            -   The component will receive the `category` name.
            -   The `formatTopicNameForListener` helper function will be used to transform the name if it starts with "Your ".
    -   **Topic Descriptions**:
        -   When fetching `PromptCategory` data for the Listener view, the `descriptionListener` field will be selected.
        -   This `descriptionListener` field will be used directly in UI components for the Listener role, falling back to `description` if `descriptionListener` is null or empty (though `descriptionListener` should ideally be populated for all relevant categories).

## 5. Alternatives Considered

-   **Adding a new column (e.g., `listenerCategoryName`) to `PromptCategory`**:
    -   *Pros*: Explicitly stores the Listener-facing name in the database.
    -   *Cons*: Requires schema migration, data backfill, and increases data redundancy. This is considered overkill for a simple prefix replacement.
-   **Backend RPC Transformation**:
    -   *Pros*: Centralizes transformation logic in an RPC.
    -   *Cons*: May require creating or modifying existing RPC functions solely for this presentational change. Direct frontend transformation in RSCs is more straightforward for this case.

## 6. Implementation Steps

### Step 1: Identify Target Components
-   Thoroughly examine files under `app/(authenticated)/role-listener/` to locate all components that fetch and display `PromptCategory.category` and `PromptCategory.description` names.
-   Pay close attention to dynamic route segments like `app/(authenticated)/role-listener/[id]/...` where `[id]` likely represents the `profileSharerId` whose topics are being viewed.

### Step 2: Create a Transformation Utility Function
-   Develop a simple utility function to handle the string replacement. This function can be placed in a relevant utils directory or be local to the components if not widely reused.

    ```typescript
    // Example: /utils/formatting.ts or similar
    /**
     * Formats a topic name for the Listener's perspective.
     * If the topicName starts with "Your ", it replaces it with "Their ".
     * @param topicName The original topic name.
     * @returns The formatted topic name for the Listener.
     */
    export function formatTopicNameForListener(topicName: string | null | undefined): string {
      if (typeof topicName !== 'string') {
        return ''; // Or handle as appropriate
      }
      if (topicName.startsWith('Your ')) {
        return 'Their ' + topicName.substring(5);
      }
      return topicName;
    }
    ```

### Step 3: Apply Transformation in Components
-   In the identified React Server Components, import and use the `formatTopicNameForListener` function when preparing topic data for display.
-   Ensure that `descriptionListener` is fetched from `PromptCategory` for Listener views and used in place of (or as a preferred alternative to) `description`.

    ```typescript
    // Inside a React Server Component for the Listener view
    import { formatTopicNameForListener } from '@/utils/formatting'; // Adjust path as needed

    // Assuming 'promptCategories' is an array of fetched PromptCategory objects
    // Make sure the fetch query includes 'descriptionListener'
    const categoriesToDisplay = promptCategories.map(pc => ({
      ...pc,
      // Use the original 'category' for internal logic if needed,
      // and 'displayName' for rendering.
      displayName: formatTopicNameForListener(pc.category),
      // Use descriptionListener if available, otherwise fall back to original description
      displayDescription: pc.descriptionListener || pc.description, 
    }));

    // ... later in the JSX:
    // {categoriesToDisplay.map(cat => (
    //   <div key={cat.id}>
    //     <h2>{cat.displayName}</h2>
    //     <p>{cat.displayDescription}</p>
    //   </div>
    // ))}
    ```
-   **Context is Key**: Ensure this transformation for names and usage of `descriptionListener` is applied *only* when the user is in the `LISTENER` role *and* viewing another `SHARER`'s topics. The component's context (e.g., route parameters indicating a `sharerId`) will be crucial here.
-   **Specific Page Update**: For `role-listener/[id]/topics/[topicId]` page, ensure the description displayed under the page title uses the fetched `descriptionListener` content.

### Step 4: Testing
-   **Listener View (Topic Names)**: Verify that topics starting with "Your" are displayed with "Their" (e.g., "Your Parents" becomes "Their Parents").
-   **Listener View (Topic Descriptions)**: Verify that topic descriptions use the content from the `descriptionListener` field.
-   **Sharer View**: Verify that Sharers viewing their own topics still see "Your" (e.g., "Your Parents") and the standard `description`.
-   **Executor View**: Verify that Executors viewing a Sharer's topics see "Your" (e.g., "Your Parents") and the standard `description`, as they act from the Sharer's perspective.
-   Test with null or undefined category names if applicable, based on the utility function's handling.

## 7. Database Schema for `PromptCategory` (Reference)

The relevant table and column are:

-   Table: `PromptCategory`
    -   `id: uuid`
    -   `category: text` (This is the source field for the display name)
    -   `description: text`
    -   `descriptionListener: text` (Newly added for Listener-specific descriptions)
    -   `theme: USER-DEFINED`
    -   `airtableId: text`
    -   `createdAt: timestamp with time zone`
    -   `updatedAt: timestamp with time zone`

## 8. References

-   `_project-context/roles-explanation.md`
-   `.cursorrules` (for general development guidelines) 