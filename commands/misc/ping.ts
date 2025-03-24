import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

export default {
  cooldown: 1,
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply("Pong!");
  },
};
