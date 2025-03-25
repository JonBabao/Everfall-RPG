import { SlashCommandBuilder } from 'discord.js';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!');

export const execute = async (interaction) => {
    await interaction.deferReply();
    await wait(4000); 
    await interaction.editReply('Pong!');
};
