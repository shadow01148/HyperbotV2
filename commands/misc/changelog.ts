import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changelog')
        .setDescription('Displays the latest changelog'),

    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setTitle('Changelog')
            .setDescription('**v2.00**')
            .setColor(0x2f3136) // Discord dark mode color
            .addFields(
                { name: '\u200B', value: `+ Upgraded to v14\n`, inline: false }
            );

        await interaction.reply({ embeds: [embed] });
    },
};
