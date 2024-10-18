// app/@/page.tsx
import { redirect } from 'next/navigation'

export default function AtPage() {
  console.log("AtPage is being rendered");
  redirect('/select-role')
}
