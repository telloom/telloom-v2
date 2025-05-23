# Text Input Audit for Mobile Optimization

This document lists text input fields across the Telloom web application that need to be reviewed and potentially updated to ensure optimal mobile user experience, specifically regarding iOS Safari auto-zoom and input width.

## Key Guidelines to Apply:

1.  **Font Size**: Ensure all text-based `<input>`, `<textarea>`, and `<select>` elements have a `font-size` of at least `16px` on mobile.
    *   Use `className="text-[16px]"` or responsive variants like `className="text-base md:text-sm"` (if `text-base` is `16px`).
2.  **Input Width**: Ensure text inputs utilize the full available width of their parent container on mobile, with appropriate padding.
    *   Use `className="w-full"`.

---

## To-Do List:

### `components/auth/LoginForm.tsx` (Partially Addressed)

*   [x] `<Input type="email">` (Email) - `text-[16px]` applied.
*   [x] `<Input type="password">` (Password) - `text-[16px]` applied.

### `components/ui/input.tsx`

*   This is the base `Input` component. Changes here will have a wide impact.
    *   Needs careful review to see if a default `text-[16px]` or responsive classes should be added to its base styles or if it should be handled by consuming components.
    *   Currently has `text-sm` in its default `cn` call.

### `components/profile/ProfileForm.tsx` (Addressed)

*   [x] `<Input placeholder="Search states...">` (Inside `StateDropdown` - Desktop/Tablet Popover) - Styled with `h-9 w-full rounded-md pl-8 text-sm`.
*   [x] `<Input placeholder="Search states...">` (Inside `StateDropdown` - Mobile Drawer) - Styled with `h-8 px-2 pl-8 text-[16px] rounded-full w-full md:h-10 md:px-3 md:pl-9 md:text-sm`.
*   [x] `<Button>` (StateDropdown PopoverTrigger) - Styled with `h-8 px-3 text-[16px] rounded-full md:h-9 md:text-sm`.
*   [x] `<Button>` (StateDropdown SheetTrigger) - Styled with `h-8 px-3 text-[16px] rounded-full md:h-9 md:text-sm`.
*   [x] `<Input id="firstName" name="firstName">` (First Name) - Styled with `h-8 px-3 text-[16px] rounded-full md:h-9 md:text-sm`.
*   [x] `<Input id="lastName" name="lastName">` (Last Name) - Styled with `h-8 px-3 text-[16px] rounded-full md:h-9 md:text-sm`.
*   [x] `<Input id="email" name="email" type="email">` (Email) - Styled with `h-8 px-3 text-[16px] rounded-full md:h-9 md:text-sm`.
*   [x] `<Input id="phone" name="phone" type="tel">` (Phone) - Styled with `h-8 px-3 text-[16px] rounded-full md:h-9 md:text-sm`.
*   [x] `<Input id="addressStreet" name="addressStreet">` (Street Address) - Styled with `h-8 px-3 text-[16px] rounded-full md:h-9 md:text-sm`.
*   [x] `<Input id="addressUnit" name="addressUnit">` (Unit/Apt) - Styled with `h-8 px-3 text-[16px] rounded-full md:h-9 md:text-sm`.
*   [x] `<Input id="addressCity" name="addressCity">` (City) - Styled with `h-8 px-3 text-[16px] rounded-full md:h-9 md:text-sm`.
*   [x] `<Input id="addressZipcode" name="addressZipcode">` (Zip Code) - Styled with `h-8 px-3 text-[16px] rounded-full md:h-9 md:text-sm`.
*   [x] `<Button>` (Crop Dialog - Cancel) - Styled with `h-8 px-3 text-[16px] rounded-full md:h-9 md:px-4 md:text-sm`.
*   [x] `<Button>` (Crop Dialog - Apply) - Styled with `h-8 px-3 text-[16px] rounded-full md:h-9 md:px-4 md:text-sm`.
*   [x] `<Button>` (Save Changes) - Styled with `w-full h-8 px-3 text-[16px] rounded-full md:w-auto md:h-9 md:px-4 md:text-sm`.
*   Note: `<Textarea id="bio" name="bio">` (Bio) was listed but not found in the provided file for styling. It might be in a different related component or was removed. If it exists elsewhere and needs styling, it should be addressed separately.
*   Note: `<Input id="middleName" name="middleName">`, `<Input id="preferredName" name="preferredName">`, `<Input id="maidenName" name="maidenName">`, `<Input id="dob" name="dob" type="date">` were listed in audit but not found in `ProfileForm.tsx`.

### `components/auth/SignUp.tsx` (Addressed)

*   [x] `<Input id="email" name="email" type="email">` - Styled with `h-8 px-2 text-[16px] rounded-full md:h-9 md:px-3 md:text-sm border-input`.
*   [x] `<Input id="password" name="password" type="password">` - Styled with `h-8 px-2 text-[16px] rounded-full md:h-9 md:px-3 md:text-sm border-input`.
*   [x] `<Input id="confirmPassword" name="confirmPassword" type="password">` - Styled with `h-8 px-2 text-[16px] rounded-full md:h-9 md:px-3 md:text-sm border-input`.
*   [x] `<Input id="firstName" name="firstName" type="text">` - Styled with `h-8 px-2 text-[16px] rounded-full md:h-9 md:px-3 md:text-sm border-input`.
*   [x] `<Input id="lastName" name="lastName" type="text">` - Styled with `h-8 px-2 text-[16px] rounded-full md:h-9 md:px-3 md:text-sm border-input`.
*   [x] `<Input id="phone" name="phone" type="tel">` - Styled with `h-8 px-2 text-[16px] rounded-full md:h-9 md:px-3 md:text-sm border-input`.
*   [x] `<Button type="submit">` (Sign Up Button) - Styled with `w-full h-8 px-3 text-[16px] rounded-full md:h-9 md:px-4 md:text-sm`.

### `components/ui/input-otp.tsx`

*   `<InputOTPSlot>`: These are individual slots for OTP. The styling `text-sm` is applied to the parent `InputOTPGroup`. Need to verify if `16px` is needed for these specific slots to prevent zoom, though OTP inputs are often handled differently by browsers.

### `components/ui/textarea.tsx`

*   This is the base `Textarea` component.
    *   Needs review similar to `components/ui/input.tsx`.
    *   Currently has `text-sm` in its default `cn` call.

### `app/invitation/accept/page.tsx`

*   Within Login Form section:
    *   `<Input id="login-email" name="email" type="email">`
    *   `<Input type="password">` (Password for login - assumed, not explicitly named `id` or `name` in snippet)
*   Within Signup Form section:
    *   `<Input name="firstName" type="text">` (First Name)
    *   `<Input name="lastName" type="text">` (Last Name)
    *   `<Input id="phone" name="phone" type="tel">` (Phone Number)
    *   `<Input id="password" name="password" type="password">` (Password for signup)
    *   `<Input name="confirmPassword" type="password">` (Confirm Password)

### `components/UserProfileForm.tsx`

*   `<Input type="file" name="avatar">` (Avatar Upload - file inputs behave differently regarding zoom, likely okay)
*   `<Input id="firstName" name="firstName">`
*   `<Input id="lastName" name="lastName">`
*   `<Input id="phone" name="phone">` (type="tel" is implied by usage)
*   `<Textarea id="bio" name="bio">` (Bio)
*   `<Input id="executorFirstName" name="executorFirstName">` (Executor First Name)
*   `<Input id="executorLastName" name="executorLastName">` (Executor Last Name)
*   `<Input id="executorEmail" name="executorEmail" type="email">` (Executor Email)
*   `<Input id="executorPhone" name="executorPhone">` (Executor Phone - type="tel" implied)
*   `<Input id="executorRelation" name="executorRelation">` (Executor Relation)

### `components/ui/select.tsx`

*   This is the base `Select` component structure.
    *   The `SelectTrigger` currently has `text-sm`. `select` elements also cause zoom on iOS if font size is too small. This needs to be `16px` or handled by consuming components.

### `components/invite/InviteModal.tsx`

*   Listener Tab:
    *   `<Input name="listenerName">` (Name)
    *   `<Input name="listenerEmail" type="email">` (Email)
    *   `<Select name="listenerRelation">` (Relation)
*   Executor Tab:
    *   `<Input name="executorName">` (Name)
    *   `<Input name="executorEmail" type="email">` (Email)
    *   `<Select name="executorRelation">` (Relation)
    *   `<Input name="phone">` (Phone - likely `type="tel"`)

### `components/listener/RequestFollowForm.tsx` (Addressed)

*   [x] `<Input placeholder="Enter their email address">` (Sharer's Email) - Applied `text-[16px] md:text-sm rounded-full h-8 px-2 md:h-9 md:px-3`.
*   Button associated with this form - Styled with `h-8 px-3 text-[16px] md:h-9 md:px-4 md:text-sm`.

### `components/listener/ListenerTopicsTable.tsx` (Addressed)

*   [x] `<Input placeholder="Search topics...">` (Search Topics) - Applied `h-8 px-2 pl-8 text-[16px] rounded-full md:h-9 md:px-3 md:pl-10 md:text-sm`.
*   [x] `<Select>` for Theme Filter - Applied `h-8 px-3 text-[16px] rounded-full md:h-9 md:text-sm` to `SelectTrigger`.

---
*This list was generated based on a codebase search. Manual verification of each item in context is recommended.* 