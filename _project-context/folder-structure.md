# Telloom App Directory Structure

```typescript
app/
├── (auth)                          // Authentication routes group
│   ├── login                       // Login page
│   │   └── page.tsx
│   ├── register                    // Registration page
│   │   └── page.tsx
│   ├── verify                      // Email verification page
│   │   └── page.tsx
│   └── forgot-password            // Password reset page
│       └── page.tsx
│
├── (authenticated)                 // Protected routes group
│   ├── role-sharer                // Sharer role routes
│   │   ├── dashboard              // Sharer dashboard
│   │   │   └── page.tsx
│   │   ├── topics                 // Topics management
│   │   │   ├── [id]              // Individual topic
│   │   │   │   ├── page.tsx
│   │   │   │   └── topic-summary
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   │   └── page.tsx
│   │   ├── prompts               // Prompts management
│   │   │   ├── [id]             // Individual prompt
│   │   │   │   ├── page.tsx
│   │   │   │   ├── prompt-actions.tsx
│   │   │   │   └── video-response-section.tsx
│   │   │   └── page.tsx
│   │   ├── media                // Media library
│   │   │   └── page.tsx
│   │   └── settings            // Sharer settings
│   │       └── page.tsx
│   │
│   ├── role-listener           // Listener role routes
│   │   ├── dashboard          // Listener dashboard
│   │   │   └── page.tsx
│   │   ├── feed              // Auto-play feed
│   │   │   └── page.tsx
│   │   ├── topics           // Topics view
│   │   │   ├── [id]        // Individual topic
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── favorites       // Favorites page
│   │   │   └── page.tsx
│   │   ├── recently-watched // Recently watched
│   │   │   └── page.tsx
│   │   └── settings       // Listener settings
│   │       └── page.tsx
│   │
│   ├── role-executor     // Executor role routes
│   │   ├── dashboard    // Executor dashboard
│   │   │   └── page.tsx
│   │   ├── sharers     // Managed sharers
│   │   │   ├── [id]   // Individual sharer
│   │   │   │   ├── page.tsx
│   │   │   │   ├── media
│   │   │   │   │   └── page.tsx
│   │   │   │   └── invites
│   │   │   │       └── page.tsx
│   │   │   └── page.tsx
│   │   └── settings  // Executor settings
│   │       └── page.tsx
│   │
│   └── settings      // Common authenticated settings
│       └── page.tsx
│
├── api              // API routes
│   ├── ai          // AI-related endpoints
│   │   ├── clean-transcript
│   │   │   └── route.ts
│   │   └── generate-summary
│   │       └── route.ts
│   ├── mux        // Mux video handling
│   │   ├── download
│   │   │   └── route.ts
│   │   └── upload
│   │       └── route.ts
│   ├── webhooks   // Webhook handlers
│   │   ├── mux
│   │   │   ├── route.ts
│   │   │   └── topic-video
│   │   │       └── route.ts
│   │   └── revenue-cat
│   │       └── route.ts
│   └── trpc      // tRPC API routes
│       └── [trpc]
│           └── route.ts
│
├── error.tsx    // Global error handling
├── layout.tsx   // Root layout
├── loading.tsx  // Global loading state
└── page.tsx     // Landing page
```

## Key Features of the Structure

1. **Route Groups**: Uses parentheses for logical grouping (e.g., `(auth)`, `(authenticated)`) without affecting URL structure

2. **Role-Based Organization**: Separates routes by user roles (sharer, listener, executor) for clear organization

3. **Dynamic Routes**: Uses square brackets for dynamic segments (e.g., `[id]`)

4. **API Organization**: Structured API routes for different services (AI, Mux, webhooks)

5. **Shared Components**: Common layouts and error handling at the root level

6. **Protected Routes**: All routes under `(authenticated)` are protected by authentication

7. **Parallel Routes**: Supports parallel routing for complex layouts when needed

## Naming Conventions

- All route folders use kebab-case
- All component files use PascalCase
- API route files are named `route.ts`
- Page files are named `page.tsx`
- Layout files are named `layout.tsx`
- Error boundaries are named `error.tsx`
- Loading states are named `loading.tsx`

## Security Considerations

- Authentication is handled at the route group level
- API routes are properly segregated
- Sensitive operations are protected under authenticated routes
- Role-based access control is implemented at the route level

## Performance Optimizations

- Route groups enable better code splitting
- API routes are organized for optimal edge caching
- Common layouts are shared across routes
- Loading states are implemented for better UX
``` 