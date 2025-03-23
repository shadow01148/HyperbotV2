import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Replies with information about the bot.'),
    async execute(interaction: ChatInputCommandInteraction) {
        /** @type {import('discord.js').Embed} */
        const embed = new EmbedBuilder()
            .setTitle('HyperVerify Rewrite')
            .setDescription('Hyperbot is a utility bot for the Plane Crazy Community Discord server. It is designed to help manage the server and provide useful tools for the community.')
            .setColor('#0099ff')
            .addFields(
                { name: 'Features', value: 'Hyperbot has a variety of features, including moderation commands, utility commands, and fun commands. It also has a built-in verification system for the Plane Crazy Community Discord server.' },
            )
            .setFooter({ text: 'Hyperbot', iconURL: 'https://files.catbox.moe/jqdx3p.png' })
            .setThumbnail(interaction.client.user.displayAvatarURL({ size: 1024 }))
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },
};