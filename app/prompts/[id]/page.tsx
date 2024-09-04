import { notFound } from 'next/navigation';
import { db } from '../../../db/db';
import { promptsPrimaryTable } from '../../../db/schema/prompts_primary';
import { eq } from 'drizzle-orm';
import dynamic from 'next/dynamic';

const VideoUpload = dynamic(() => import('../../../components/VideoUpload'), { ssr: false });
const VideoRecorder = dynamic(() => import('../../../components/VideoRecorder'), { ssr: false });

async function getPrompt(id: string) {
  const prompt = await db.select()
    .from(promptsPrimaryTable)
    .where(eq(promptsPrimaryTable.id, id))
    .limit(1);

  return prompt[0] || null;
}

export default async function PromptPage({ params }: { params: { id: string } }) {
  const prompt = await getPrompt(params.id);

  if (!prompt) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">{prompt.prompt}</h1>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Upload Video Response</h2>
        <VideoUpload promptId={prompt.id} />
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-4">Record Video Response</h2>
        <VideoRecorder promptId={prompt.id} />
      </div>
    </div>
  );
}