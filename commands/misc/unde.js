const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unde')
        .setDescription('Unde commands.')
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Add a user')
                .addUserOption(option =>
                    option.setName("user")
                        .setDescription("Select a user")
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Remove a user')
                .addUserOption(option =>
                    option.setName("user")
                        .setDescription("Select a user")
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName("random")
                .setDescription("Select a random user.")
        ),

    async execute(interaction) {
        await interaction.reply("This command portion is redundant.");
    },
};
