import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Header from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

const prisma = new PrismaClient()

export default async function Dashboard() {
  const cookieStore = cookies()
  const sessionToken = cookieStore.get('session')?.value

  if (!sessionToken) {
    redirect('/signin')
  }

  const user = await prisma.profile.findFirst({
    where: {
      sessions: {
        some: {
          sessionToken: sessionToken
        }
      }
    },
    select: {
      email: true,
      // Assuming you have a relation to prompts and responses
      responses: {
        include: {
          prompt: {
            select: {
              category: true
            }
          },
          video: true
        }
      }
    }
  })

  if (!user) {
    redirect('/signin')
  }

  // Group responses by prompt category
  const responsesByCategory = user.responses.reduce((acc, response) => {
    const category = response.prompt.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(response)
    return acc
  }, {})

  return (
    <div className="flex flex-col min-h-screen">
      <Header user={user} />
      <main className="flex-grow p-6">
        <h1 className="text-4xl font-bold mb-6">Your Prompt Categories</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(responsesByCategory).map(([category, responses]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">View Responses</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      {responses.map((response, index) => (
                        <div key={index} className="p-2 bg-secondary rounded">
                          <p className="font-semibold">{response.prompt.text}</p>
                          <video src={response.video.url} controls className="w-full mt-2" />
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}