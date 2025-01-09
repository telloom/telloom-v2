import 'dotenv/config';
import Replicate from "replicate";

async function testReplicate() {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN is not set in environment variables");
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Test a simple prediction with a public model
    const output = await replicate.run(
      "stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4",
      {
        input: {
          prompt: "a photo of an astronaut riding a horse"
        }
      }
    );

    console.log("Successfully connected to Replicate!");
    console.log("Model output:", output);
  } catch (error) {
    console.error("Error connecting to Replicate:", error);
  }
}

testReplicate(); 