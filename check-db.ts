import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    // Count total prompts
    const promptCount = await prisma.prompt.count();
    console.log(`Total prompts in database: ${promptCount}`);

    // Get a sample of prompts
    const samplePrompts = await prisma.prompt.findMany({
      take: 5,
      include: {
        promptCategory: true
      }
    });

    console.log('\nSample prompts:');
    samplePrompts.forEach(prompt => {
      console.log(`\nPrompt: "${prompt.promptText}"`);
      console.log(`Type: ${prompt.promptType}`);
      console.log(`Category: ${prompt.promptCategory?.category || 'No category'}`);
    });

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase(); 