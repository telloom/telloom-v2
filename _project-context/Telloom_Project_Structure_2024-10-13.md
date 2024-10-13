Process
Process any GitHub link. Projects, files, or folders.

telloom_telloom-v2.md
├── .cursorrules
├── .eslintignore
├── .eslintrc.json
├── .gitignore
├── .vscode
    ├── extensions.json
    └── settings.json
├── README.md
├── _project-context
    ├── Telloom_Backend_Setup.md
    ├── Telloom_Frontend_Setup.md
    ├── collect_code.sh
    ├── project_structure.txt
    ├── supabase_nextjs-user-management.md
    ├── telloom-schema-summary.md
    ├── telloom-sql-rules.md
    └── telloom-storyboard.md
├── airtable-supabase-sync
    └── sync.ts
├── app
    ├── (auth)
    │   ├── error
    │   │   └── page.tsx
    │   ├── forgot-password
    │   │   └── page.tsx
    │   ├── login
    │   │   ├── actions.ts
    │   │   └── page.tsx
    │   ├── reset-password
    │   │   └── [token]
    │   │   │   └── page.tsx
    │   └── signup
    │   │   ├── actions.ts
    │   │   └── page.tsx
    ├── (authenticated)
    │   ├── notifications
    │   │   └── page.tsx
    │   ├── profile
    │   │   └── page.tsx
    │   └── settings
    │   │   └── page.tsx
    ├── (public)
    │   ├── help
    │   │   └── page.js
    │   └── home
    │   │   └── page.js
    ├── api
    │   ├── auth
    │   │   ├── forgot-password
    │   │   │   └── route.ts
    │   │   ├── logout
    │   │   │   └── route.ts
    │   │   └── reset-password
    │   │   │   └── route.ts
    │   ├── mux
    │   │   ├── upload
    │   │   │   └── route.ts
    │   │   └── webhook
    │   │   │   └── route.ts
    │   ├── prompts
    │   │   └── route.ts
    │   ├── select-role
    │   │   └── route.ts
    │   ├── subscriptions
    │   │   └── route.tsx
    │   └── users
    │   │   ├── roles
    │   │       └── route.ts
    │   │   └── route.ts
    ├── auth
    │   ├── callback
    │   │   └── route.ts
    │   ├── confirm
    │   │   └── route.ts
    │   ├── confirmed
    │   │   └── page.tsx
    │   └── error
    │   │   ├── page.tsx
    │   │   └── route.ts
    ├── layout.tsx
    ├── page.tsx
    ├── private
    │   └── page.tsx
    ├── role-admin
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── prompts
    │   │   ├── [promptId]
    │   │   │   ├── edit
    │   │   │   │   └── page.tsx
    │   │   │   └── page.tsx
    │   │   ├── new
    │   │   │   └── page.tsx
    │   │   └── page.tsx
    │   ├── sharers
    │   │   └── [sharerId]
    │   │   │   ├── content
    │   │   │       └── page.tsx
    │   │   │   ├── dashboard
    │   │   │       ├── layout.tsx
    │   │   │       └── page.tsx
    │   │   │   ├── executor-management
    │   │   │       └── page.tsx
    │   │   │   ├── followers
    │   │   │       └── page.tsx
    │   │   │   ├── invitations
    │   │   │       └── page.tsx
    │   │   │   ├── media-management
    │   │   │       └── page.tsx
    │   │   │   ├── page.tsx
    │   │   │   ├── prompt-responses
    │   │   │       ├── [responseId]
    │   │   │       │   └── page.tsx
    │   │   │       └── page.tsx
    │   │   │   ├── prompts
    │   │   │       ├── [promptId]
    │   │   │       │   └── page.tsx
    │   │   │       └── page.tsx
    │   │   │   ├── subscription
    │   │   │       └── page.tsx
    │   │   │   ├── thematic-videos
    │   │   │       ├── [thematicVideoId]
    │   │   │       │   └── page.tsx
    │   │   │       └── page.tsx
    │   │   │   └── topics
    │   │   │       ├── [topicId]
    │   │   │           └── page.tsx
    │   │   │       └── page.tsx
    │   └── topics
    │   │   ├── [topicId]
    │   │       ├── edit
    │   │       │   └── page.tsx
    │   │       └── page.tsx
    │   │   ├── new
    │   │       └── page.tsx
    │   │   └── page.tsx
    ├── role-executor
    │   ├── dashboard
    │   │   └── page.tsx
    │   ├── layout.tsx
    │   ├── onboarding
    │   │   └── page.tsx
    │   ├── page.tsx
    │   ├── profile
    │   │   └── page.tsx
    │   ├── settings
    │   │   └── page.tsx
    │   └── sharers
    │   │   ├── [sharerId]
    │   │       ├── content
    │   │       │   └── page.tsx
    │   │       ├── dashboard
    │   │       │   ├── layout.tsx
    │   │       │   └── page.tsx
    │   │       ├── executor-management
    │   │       │   └── page.tsx
    │   │       ├── followers
    │   │       │   └── page.tsx
    │   │       ├── invitations
    │   │       │   └── page.tsx
    │   │       ├── media-management
    │   │       │   └── page.tsx
    │   │       ├── prompt-responses
    │   │       │   ├── [responseId]
    │   │       │   │   └── page.tsx
    │   │       │   └── page.tsx
    │   │       ├── prompts
    │   │       │   ├── [promptId]
    │   │       │   │   └── page.tsx
    │   │       │   └── page.tsx
    │   │       ├── subscription
    │   │       │   └── page.tsx
    │   │       ├── thematic-videos
    │   │       │   ├── [thematicVideoId]
    │   │       │   │   └── page.tsx
    │   │       │   └── page.tsx
    │   │       └── topics
    │   │       │   ├── [topicId]
    │   │       │       └── page.tsx
    │   │       │   └── page.tsx
    │   │   └── page.tsx
    ├── role-listener
    │   ├── dashboard
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── favorites
    │   │   └── page.tsx
    │   ├── feed
    │   │   └── page.tsx
    │   ├── following
    │   │   └── page.tsx
    │   ├── layout.tsx
    │   ├── onboarding
    │   │   └── page.tsx
    │   ├── page.tsx
    │   ├── prompt-responses
    │   │   ├── [responseId]
    │   │   │   └── page.tsx
    │   │   └── page.tsx
    │   ├── recently-watched
    │   │   └── page.tsx
    │   ├── search
    │   │   └── page.tsx
    │   ├── settings
    │   │   └── page.tsx
    │   ├── thematic-videos
    │   │   ├── [thematicVideoId]
    │   │   │   └── page.tsx
    │   │   └── page.tsx
    │   └── topics
    │   │   ├── [topicId]
    │   │       └── page.tsx
    │   │   └── page.tsx
    ├── role-sharer
    │   ├── content
    │   │   └── page.tsx
    │   ├── dashboard
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── executor-management
    │   │   └── page.tsx
    │   ├── followers
    │   │   └── page.tsx
    │   ├── invitations
    │   │   └── page.tsx
    │   ├── layout.tsx
    │   ├── media-management
    │   │   └── page.tsx
    │   ├── onboarding
    │   │   └── page.tsx
    │   ├── page.tsx
    │   ├── prompt-responses
    │   │   ├── [responseId]
    │   │   │   └── page.tsx
    │   │   └── page.tsx
    │   ├── prompts
    │   │   ├── [promptId]
    │   │   │   └── page.tsx
    │   │   └── page.tsx
    │   ├── settings
    │   │   └── page.tsx
    │   ├── subscription
    │   │   └── page.tsx
    │   ├── thematic-videos
    │   │   ├── [thematicVideoId]
    │   │   │   └── page.tsx
    │   │   └── page.tsx
    │   └── topics
    │   │   ├── [topicId]
    │   │       └── page.tsx
    │   │   └── page.tsx
    ├── select-role
    │   └── page.tsx
    ├── styles
    │   ├── globals.css
    │   └── tailwind.css
    └── unauthorized
    │   └── page.tsx
├── components.json
├── components
    ├── FollowerList.tsx
    ├── ForgotPassword.tsx
    ├── Header.tsx
    ├── LogoutButton.tsx
    ├── PromptResponseCard.tsx
    ├── ProtectedRoute.tsx
    ├── RoleSelection.tsx
    ├── SignForgotPassword.tsx
    ├── SignIn.tsx
    ├── SignOut.tsx
    ├── SignUp.tsx
    ├── ThemeProvider.tsx
    ├── TranscriptViewer.tsx
    ├── UserInfo.tsx
    ├── VideoPlayer.tsx
    ├── VideoRecorder.tsx
    ├── VideoUploader.tsx
    ├── register-form.tsx
    └── ui
    │   ├── accordion.tsx
    │   ├── alert.tsx
    │   ├── avatar.tsx
    │   ├── badge.tsx
    │   ├── button.tsx
    │   ├── calendar.tsx
    │   ├── card.tsx
    │   ├── carousel.tsx
    │   ├── chart.tsx
    │   ├── checkbox.tsx
    │   ├── collapsible.tsx
    │   ├── context-menu.tsx
    │   ├── dialog.tsx
    │   ├── drawer.tsx
    │   ├── dropdown-menu.tsx
    │   ├── hover-card.tsx
    │   ├── input-otp.tsx
    │   ├── input.tsx
    │   ├── label.tsx
    │   ├── menubar.tsx
    │   ├── navigation-menu.tsx
    │   ├── pagination.tsx
    │   ├── popover.tsx
    │   ├── progress.tsx
    │   ├── radio-group.tsx
    │   ├── resizable.tsx
    │   ├── scroll-area.tsx
    │   ├── select.tsx
    │   ├── separator.tsx
    │   ├── sheet.tsx
    │   ├── skeleton.tsx
    │   ├── slider.tsx
    │   ├── sonner.tsx
    │   ├── switch.tsx
    │   ├── table.tsx
    │   ├── tabs.tsx
    │   ├── textarea.tsx
    │   ├── toast.tsx
    │   ├── toaster.tsx
    │   ├── toggle-group.tsx
    │   ├── toggle.tsx
    │   └── tooltip.tsx
├── hooks
    ├── use-toast.ts
    ├── useAuth.ts
    ├── useMux.ts
    ├── useRoles.ts
    ├── useSupabase.ts
    └── useUser.ts
├── lib
    └── utils.ts
├── middleware.ts
├── next.config.js
├── package-lock.json
├── package.json
├── postcss.config.js
├── prisma
    ├── migrations
    │   └── migration_lock.toml
    └── schema.prisma
├── public
    ├── favicon.ico
    ├── icons
    │   ├── next.svg
    │   └── vercel.svg
    └── images
    │   ├── Telloom Logo V1-Horizontal Green-webbanner160.png
    │   ├── Telloom Logo V1-Horizontal Green.png
    │   ├── Telloom Logo V1-Horizontal Green320-132.png
    │   ├── Telloom Logo V1-Horizontal White.png
    │   ├── Telloom Logo V1-Square Green.png
    │   ├── Telloom Logo V1-Square White.png
    │   ├── Telloom Logo V1_Icon-Favicon.png
    │   └── Telloom Logo V1_Icon.png
├── supabase
    ├── .gitignore
    ├── config.toml
    └── seed.sql
├── tailwind.config.js
├── tsconfig.json
├── types
    ├── action-types.ts
    ├── global.d.ts
    ├── index.ts
    ├── mux-node.d.ts
    ├── supabase.ts
    └── video.ts
└── utils
    ├── muxClient.ts
    ├── supabase
        ├── admin.ts
        ├── client.ts
        ├── middleware.ts
        ├── server.ts
        └── withRole.ts
    └── utils.ts
