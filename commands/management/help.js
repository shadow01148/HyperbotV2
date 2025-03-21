const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all available commands with pagination'),
    async execute(interaction) {
        const commands = Array.from(interaction.client.commands.values());
        const commandsPerPage = 5;
        let currentPage = 0;
        const totalPages = Math.ceil(commands.length / commandsPerPage);

        function generateEmbed(page) {
            const start = page * commandsPerPage;
            const end = start + commandsPerPage;
            const commandList = commands.slice(start, end);

            const embed = new EmbedBuilder()
                .setTitle('📜 Bot Commands')
                .setColor('#00ff88') // Light green
                .setFooter({ text: `Page ${page + 1} of ${totalPages}` })
                .setDescription(commandList.map(cmd => `**/${cmd.data.name}** - ${cmd.data.description}`).join('\n') || 'No commands found.');

            return embed;
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === totalPages - 1)
            );

        const message = await interaction.reply({ 
                embeds: [generateEmbed(currentPage)], 
                components: [row] 
            }).withResponse();
            
        const collector = message.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) return await buttonInteraction.reply({ content: "❌ You're not allowed to use this button!", ephemeral: true });

            if (buttonInteraction.customId === 'prev' && currentPage > 0) currentPage--;
            else if (buttonInteraction.customId === 'next' && currentPage < totalPages - 1) currentPage++;

            await buttonInteraction.update({
                embeds: [generateEmbed(currentPage)],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('prev')
                                .setLabel('Previous')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(currentPage === 0),
                            new ButtonBuilder()
                                .setCustomId('next')
                                .setLabel('Next')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(currentPage === totalPages - 1)
                        )
                ]
            });
        });

        collector.on('end', async () => {
            await interaction.editReply({ components: [] });
        });
    },
};
