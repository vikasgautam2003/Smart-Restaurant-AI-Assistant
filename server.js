import express from 'express';
import dotenv from "dotenv";
import path from 'path';

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { DynamicStructuredTool } from 'langchain/tools';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

import { menuData } from './menuData.js'; 

dotenv.config();
const port = 3000;
const app = express();
app.use(express.json());

const __dirname = path.resolve();

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.7,
  maxOutputTokens: 1024,
  apiKey: process.env.GOOGLE_API_KEY,
});

// const getMenuTool = new DynamicStructuredTool({
//   name: 'getMenuTool',
//   description:
//     "return the final answer for today's menu for the given category {Breakfast, lunch, dinner}. Use this tool to directly answer the user menu question",
//   schema: z.object({
//     category: z.string().describe("Type of food. Example: Breakfast, lunch, dinner"),
//   }),

//   func: async ({ category }) => {
//     const menu = {
//       breakfast:
//         "Pancakes, Omelette, Fruit Salad, Coffee, Poha, Aloo Paratha, Masala Dosa, Masala Chai",
//       lunch:
//         "Grilled Chicken, Caesar Salad, Veggie Wrap, Lemonade, Paneer Butter Masala, Dal Makhani, Naan, Gulab Jamun",
//       dinner:
//         "Steak, Roasted Vegetables, Mashed Potatoes, Red Wine, Butter Chicken, Biryani, Raita, Kheer",
//     };

//     return menu[category.toLowerCase()] || "Sorry, we don't have a menu for that category.";
//   },
// });



const getMenuTool = new DynamicStructuredTool({
  name: 'getMenuTool',
  description:
    "Return today's menu for a given cuisine and category (e.g., Indian breakfast, Italian dinner).",
  schema: z.object({
    cuisine: z.string().describe("Cuisine type. Example: Indian, Italian, Chinese, American"),
    category: z.string().describe("Type of food. Example: Breakfast, lunch, dinner, snacks, desserts, beverages"),
  }),
  func: async ({ cuisine, category }) => {
    const cuisineData = menuData[cuisine.toLowerCase()];
    if (!cuisineData) return `Sorry, we don't have a menu for ${cuisine}.`;

    const items = cuisineData[category.toLowerCase()];
    if (!items) return `Sorry, we don't have a ${category} menu for ${cuisine}.`;

    return items.join(", ");
  },

});

const prompt = ChatPromptTemplate.fromMessages([
 ["system", `You are a helpful restaurant menu assistant.
- Use the tool ONLY when you need to fetch a menu.
- Once you have the result from the tool, return it directly to the user as your final answer.
- Do not call the tool repeatedly with the same input.`],
  ["human", "{input}"],
  ["ai", "{agent_scratchpad}"],
]);

const agent = await createToolCallingAgent({
  llm: model,
  tools: [getMenuTool],
  prompt,
});

const executor = await AgentExecutor.fromAgentAndTools({
  agent,
  tools: [getMenuTool],
  verbose: true,
  maxIterations: 10,
  returnIntermediateSteps: false,
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/chat', async (req, res) => {
  const userInput = req.body.message;
  console.log("User Input: ", userInput);
  try {
    const response = await executor.invoke({ input: userInput });

    console.log("Agent full response: ", response);

    if (response.output && response.output !== "Agent stopped due to max iterations.") {
      return res.json({ output: response.output });
    }

    res.status(500).json({ output: 'Could not generate a response' });
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).json({ output: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
