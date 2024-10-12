'use client'

import { Button } from "../components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from 'next/navigation'

export default function Component() {
  const router = useRouter()

  const handleLogin = () => {
    router.push('/login')
  }

  const handleSignUp = () => {
    router.push('/signup')
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <main className="flex-1 flex items-center justify-center">
        <div className="container px-4 md:px-6 flex flex-col items-center text-center">
          <div className="space-y-6 max-w-[600px]">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
              Welcome to Telloom
            </h1>
            <p className="text-lg text-gray-500 md:text-xl">
              Connect, share, and discover with Telloom. Your new favorite social platform.
            </p>
            <div className="flex flex-col gap-4 min-[400px]:flex-row justify-center">
              <Button 
                size="lg" 
                className="w-full min-[400px]:w-auto"
                onClick={handleSignUp}
              >
                Sign Up
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full min-[400px]:w-auto"
                onClick={handleLogin}
              >
                Log In
              </Button>
            </div>
          </div>
        </div>
      </main>
      <footer className="w-full py-6 px-4 md:px-6 border-t">
        <div className="container flex flex-col gap-4 sm:flex-row sm:items-center">
          <p className="text-xs text-gray-500">© 2024 Telloom. All rights reserved.</p>
          <nav className="sm:ml-auto flex gap-4 sm:gap-6">
            <Link className="text-xs hover:underline underline-offset-4" href="#">
              Terms of Service
            </Link>
            <Link className="text-xs hover:underline underline-offset-4" href="#">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
