# Telloom Password Reset Functionality

This document provides an overview of the password reset functionality in Telloom and instructions on how to test it.

## Overview

The password reset flow consists of two main steps:

1. **Forgot Password**: User enters their email address to request a password reset link.
2. **Reset Password**: User clicks the link in their email and sets a new password.

## Implementation Details

### Components

- `ForgotPasswordForm`: Allows users to request a password reset link.
- `ResetPasswordForm`: Allows users to set a new password after clicking the reset link.

### API Routes

- `/api/auth/forgot-password`: Handles the request to send a password reset email.
- `/api/auth/reset-password`: Handles the request to update the user's password.

### Pages

- `/forgot-password`: Displays the forgot password form.
- `/reset-password`: Displays the reset password form.

## Testing the Password Reset Flow

### Prerequisites

1. Ensure you have a valid user account in the system.
2. Make sure your Supabase project is properly configured.
3. Ensure the `LOOPS_PASSWORD_RESET_TEMPLATE_ID` environment variable is set if using Loops.so for sending emails.

### Test Steps

1. **Request Password Reset**:
   - Navigate to `/forgot-password`.
   - Enter your email address and submit the form.
   - You should see a success message indicating that a reset link has been sent.

2. **Reset Password**:
   - Check your email for the password reset link.
   - Click the link, which should take you to `/reset-password` with either:
     - `?access_token=xxx` (custom implementation)
     - `?token_hash=xxx&type=recovery` (Supabase default format)
   - Enter a new password that meets the requirements (minimum 8 characters, must include letters and numbers).
   - Submit the form.
   - You should see a success message and be redirected to the login page.

3. **Login with New Password**:
   - Navigate to `/login`.
   - Enter your email and the new password.
   - You should be able to log in successfully.

## Troubleshooting

### Common Issues

1. **Reset Link Not Received**:
   - Check your spam folder.
   - Verify that the email address is correct and associated with a valid account.
   - Check Supabase logs for any email delivery issues.

2. **Invalid or Expired Token**:
   - Password reset tokens expire after a certain period (usually 24 hours).
   - Request a new reset link if the current one has expired.

3. **Password Requirements**:
   - Ensure your new password meets all requirements:
     - Minimum 8 characters
     - Must include at least one letter
     - Must include at least one number

4. **URL Format Issues**:
   - The application supports both custom token format (`access_token`) and Supabase's default format (`token_hash`).
   - If you're using Supabase's built-in email service, the URL will contain `token_hash` and `type=recovery`.
   - If you're using a custom email service like Loops.so, you can configure the URL format.

### Logs and Debugging

- Check the browser console for any client-side errors.
- Check the server logs for any API errors.
- Verify that the Supabase configuration is correct.

## Using Loops.so for Password Reset Emails

To use Loops.so instead of Supabase's built-in email service:

1. Disable Supabase Auth emails in the Supabase dashboard.
2. Create a password reset email template in Loops.so with a `resetLink` data variable.
3. Set the `LOOPS_PASSWORD_RESET_TEMPLATE_ID` environment variable to the ID of your Loops.so template.
4. Update the `forgot-password` API route to use the `sendPasswordResetEmail` function from `utils/loops.ts`.

## Security Considerations

- Password reset tokens are single-use and expire after a certain period.
- The API does not reveal whether an email address is associated with an account for security reasons.
- Passwords are securely hashed and stored by Supabase.
- All communications are encrypted using HTTPS. 