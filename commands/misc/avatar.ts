import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Displays a user's avatar.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user whose avatar you want to see.")
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user") || interaction.user;

    const avatarURL = user.displayAvatarURL({ size: 1024 });

    const embed = new EmbedBuilder()
      .setColor(0x1f8b4c)
      .setAuthor({ name: user.username, iconURL: avatarURL })
      .setTitle("User Avatar")
      .setImage(avatarURL)
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({}),
      });

    await interaction.reply({ embeds: [embed] });
  },
};
