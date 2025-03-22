const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Displays a user's avatar.")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user whose avatar you want to see.")
                .setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser("user") || interaction.user;

        const avatarURL = user.displayAvatarURL({ dynamic: true, size: 1024 });

        const embed = new EmbedBuilder()
            .setColor(0x1f8b4c)
            .setAuthor({ name: user.username, iconURL: avatarURL })
            .setTitle("User Avatar")
            .setImage(avatarURL)
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

        await interaction.reply({ embeds: [embed] });
    }
};
