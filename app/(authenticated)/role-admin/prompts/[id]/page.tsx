import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminPromptPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Prompt Management</h1>
      {/* Add your prompt management interface here */}
    </div>
  );
} 