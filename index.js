import { config } from 'dotenv';
config();

import { Client, Events, GatewayIntentBits } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
    intents: [GatewayIntentBits.Guilds]  // Make sure this is defined
});

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.login(TOKEN);
