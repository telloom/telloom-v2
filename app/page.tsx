import { Metadata } from 'next'
import Layout from '../src/components/Layout'
import { createClient } from '../utils/supabase/server'
import { cookies } from 'next/headers'

export const metadata: Metadata = {
  title: 'Telloom',
  description: 'Bridging Generations through Video Storytelling',
}

export default async function Home() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: todos } = await supabase.from('todos').select()

  return (
    <Layout>
      <h1 className="text-4xl font-bold text-center my-8 text-blue-600">
        Welcome to Telloom
      </h1>
      <p className="text-center text-gray-700">
        Bridging Generations through Video Storytelling
      </p>
      <div className="text-green-500">Hello Tailwind!</div>
      <ul>
        {todos?.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </Layout>
  )
}