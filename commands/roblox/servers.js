const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { rankedRole, servers } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servers')
        .setDescription('Get the list of VIP and expert servers.'),
    async execute(interaction) {
        // check roles first
        //* @type {number} The Discord user ID
        if (!interaction.member.roles.cache.has(rankedRole)) {
            return await interaction.reply({ content: 'You are not ranked! You must be ranked to access our VIP servers.', flags: MessageFlags.Ephemeral });
        }
        await interaction.reply(`<@${interaction.user.id}>, Check your DMs!`);
        // list down servers in categories with formatting
        const serverMessage = `**PCC VIP SERVERS**
    -----------------------
    These private servers are a place where you can build without having to worry about someone potentially copying your creation! These private servers are meant for Plane Crazy Community Discord members only.

    | VIP1: ${servers[0]}
    | VIP2: ${servers[1]}

    **EXPERT SERVERS**
    ----------------------
    These servers are exclusively for members with expert-level ranks.

    | EXP1: ${servers[2]}
    | EXP2: ${servers[3]}

    ⚠️ Those found sharing private server links to anyone outside the PCC Discord or to unranked members will be banned.`;

        await interaction.user.send(serverMessage);
    },
};