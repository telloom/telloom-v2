import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPromptCategory } from "@/lib/api/prompts";
import TopicsTableAll from "@/components/TopicsTableAll";

interface TopicPageProps {
  params: {
    topicId: string;
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const category = await getPromptCategory(params.topicId);

  if (!category) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            asChild
          >
            <Link href="/role-sharer">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Topics
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {category.category}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {category.description}
          </p>
        </div>

        <TopicsTableAll 
          prompts={category.prompts} 
          categoryId={category.id}
        />
      </main>
    </div>
  );
}

