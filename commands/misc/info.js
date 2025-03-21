const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Replies with information about the bot.'),
    async execute(interaction) {
        /** @type {import('discord.js').Embed} */
        const embed = new EmbedBuilder()
            .setTitle('HyperVerify Rewrite')
            .setDescription('Hyperbot is a utility bot for the Plane Crazy Community Discord server. It is designed to help manage the server and provide useful tools for the community.')
            .setColor('GREEN')
            .addField('Features', '- Slash Commands\n- Ensured Stability\n - MongoDB Database')
            .setFooter('Hyperbot Rewrite v1.0')
            .setImage('https://files.catbox.moe/jqdx3p.png')
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },
};