import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Displays information about a user.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to get information about")
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("target") || interaction.user;
    if (!interaction.guild) return;
    const member = await interaction.guild.members.fetch(user.id);
    if (!member.joinedTimestamp) return;

    const embed = new EmbedBuilder()
      .setColor(member.displayHexColor || "#2F3136")
      .setTitle(`${user.username}'s Information`)
      .setThumbnail(user.displayAvatarURL({ size: 1024 }))
      .addFields(
        { name: "🆔 User ID", value: user.id, inline: true },
        { name: "📛 Username", value: user.tag, inline: true },
        {
          name: "📅 Account Created",
          value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: "🚪 Joined Server",
          value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
          inline: true,
        },
      )
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({}),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
