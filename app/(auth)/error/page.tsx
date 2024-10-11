import { Button } from "../../../components/ui/button"
import Link from "next/link"

export default function AuthError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
      <p className="mb-4">There was an error during the authentication process. Please try again.</p>
      <Button asChild>
        <Link href="/auth/signup">Back to Sign Up</Link>
      </Button>
    </div>
  )
}