import { GoogleGenerativeAI } from '@google/generative-ai';
import { Client, GatewayIntentBits } from 'discord.js';
import axios from 'axios';
import * as fs from 'fs';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const GOOGLE_API_KEY = config.GOOGLE_API_KEY;
const BOT_TOKEN = config.DISCORD_BOT_TOKEN;

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' });

const bot = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ], });

async function run() {
  await bot.login(BOT_TOKEN);
}

bot.once('ready', () => {
  console.log(`Bot ${bot.user?.username} logged in`);
});

bot.on('messageCreate', async (message: any) => {
  if (message.author.bot)
    return;

  if (message.mentions.has(bot.user)) {
    let result: any;
    // bot has been mentioned
    if (message.attachments.size > 0) {
      const res = await axios.get(message.attachments.first().url, {responseType: 'arraybuffer'});
      const finbuf = Buffer.from(res.data, 'binary');
      result = await model.generateContent([
        message.content,
        {
          inlineData: {
            data: finbuf.toString('base64'),
            mimeType: 'image/png',
          },
        },
      ]);

    } else {
      try {
        result = await model.generateContent([message.content]);
      } catch (err: any) {
        console.log(`Caught error: ${err}`);
        return;
      }
    }
    const aiResponse = result.response.text();
    const sanitizedOut = aiResponse.replace(/@everyone/g, '@\u200Beveryone').replace(/@here/g, '@\u200Bhere');
    try {
      await message.reply(sanitizedOut);
    } catch (err: any) {
      console.log(`Caught error: ${err}`);
    }
  }

});

run();