import express from 'express';
import dotenv from "dotenv";


import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { DynamicStructuredTool } from 'langchain/tools';
import { ChatPromptTemplate } from "@langchain/core/prompts"
import {z} from "zod";


dotenv.config();
const port = 3000;
const app = express();
app.use(express.json());


const model = new ChatGoogleGenerativeAI({
    model: "model/gemini-2.5-flash",
    temperature: 0.7,
    maxOutputTokens: 1024,
    apikey: process.env.GOOGLE_API_KEY,
})



const getMenuTool = new DynamicStructuredTool({
    name: 'getMenuTool',
    description: "return the final answer for today's menu for the given category {Breakfast, lunch, dinner}. Use this tool to directly answer the user menu question",
    schema: z.object({
        category: z.string().describe("Type of food. Example: Breakfast, lunch, dinner")
    }),

    func: async ({ category }) => {
        const menu = {
            Breakfast: "Pancakes, Omelette, Fruit Salad, Coffee, Poha, Aloo Paratha, Masala Dosa, Masala Chai",
            lunch: "Grilled Chicken, Caesar Salad, Veggie Wrap, Lemonade, Paneer Butter Masala, Dal Makhani, Naan, Gulab Jamun",
            dinner: "Steak, Roasted Vegetables, Mashed Potatoes, Red Wine, Butter Chicken, Biryani, Raita, Kheer"
        }

        return menu[category.toLowerCase()] || "Sorry, we don't have a menu for that category."; 
    }
})


app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
})