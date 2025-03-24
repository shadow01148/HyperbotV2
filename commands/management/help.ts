import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ChatInputCommandInteraction,
  ButtonInteraction,
  Collection,
} from "discord.js";

declare module "discord.js" {
  export interface Client {
    commands: Collection<string, any>;
  }
}

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows all available commands with pagination"),

  async execute(interaction: ChatInputCommandInteraction) {
    const commands = Array.from(interaction.client.commands.values());
    const commandsPerPage = 5;
    let currentPage = 0;
    const totalPages = Math.ceil(commands.length / commandsPerPage);

    const generateEmbed = (page: number) => {
      const start = page * commandsPerPage;
      const end = start + commandsPerPage;
      const commandList = commands.slice(start, end);

      return new EmbedBuilder()
        .setTitle("📜 Bot Commands")
        .setColor("#00ff88") // Light green
        .setFooter({ text: `Page ${page + 1} of ${totalPages}` })
        .setDescription(
          commandList
            .map((cmd) => `**/${cmd.data.name}** - ${cmd.data.description}`)
            .join("\n") || "No commands found.",
        );
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("Previous")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === totalPages - 1),
    );

    const message = await interaction.reply({
      embeds: [generateEmbed(currentPage)],
      components: [row],
      fetchReply: true,
    });

    const collector = message.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return await buttonInteraction.reply({
          content: "❌ You're not allowed to use this button!",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (buttonInteraction.customId === "prev" && currentPage > 0)
        currentPage--;
      else if (
        buttonInteraction.customId === "next" &&
        currentPage < totalPages - 1
      )
        currentPage++;

      return await buttonInteraction.update({
        embeds: [generateEmbed(currentPage)],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId("prev")
              .setLabel("Previous")
              .setStyle(ButtonStyle.Primary)
              .setDisabled(currentPage === 0),
            new ButtonBuilder()
              .setCustomId("next")
              .setLabel("Next")
              .setStyle(ButtonStyle.Primary)
              .setDisabled(currentPage === totalPages - 1),
          ),
        ],
      });
    });

    collector.on("end", async () => {
      await interaction.editReply({ components: [] });
    });
  },
};
