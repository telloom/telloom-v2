// app/(auth)/confirmed/page.tsx

export default function ConfirmedPage() {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="space-y-4 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold">Email Confirmed</h1>
          <p>Your email has been successfully confirmed. You can now log in.</p>
        </div>
      </div>
    );
  }