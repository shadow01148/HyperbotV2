import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    TextChannel,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
  } from "discord.js";
  
  export default {
      cooldown: 3,
      data: new SlashCommandBuilder()
          .setName("contest")
          .setDescription("Displays the top upvoted contest entries.")
          .addSubcommand((subcommand) =>
            subcommand
                .setName("top")
                .setDescription("Displays the top upvoted contest entries."),
            ),
      async execute(interaction: ChatInputCommandInteraction) {
          if (!interaction.guild) return;
          const creationsPerPage = 5;
          let currentPage = 0;
          const channel = interaction.guild.channels.cache.get("1353535051626844201");
  
          if (!channel || channel.type !== 0) return;
  
          const messages = await (channel as TextChannel).messages.fetch({ limit: 100 });
          let embeds = messages
              .filter((msg) => msg.embeds.length > 0)
              .map((msg) => {
                    const embed = msg.embeds[0];
                    const footerText = embed.footer?.text || "";
                    // extract likes and dislikes from the message reactions :like:
                    const likes = msg.reactions.cache.get("👍")?.count || 0;
                    const dislikes = msg.reactions.cache.get("👎")?.count || 0;
                    const score = likes - dislikes;
                    return { embed, likes, dislikes, score, msgLink: msg.url };
              });
  
          // Sort entries by highest score (Likes - Dislikes)
          embeds.sort((a, b) => b.score - a.score);
  
          const maxPages = Math.max(Math.ceil(embeds.length / creationsPerPage) - 1, 0);
  
          const generateEmbed = (page: number) => {
              const start = page * creationsPerPage;
              const end = start + creationsPerPage;
              const entries = embeds.slice(start, end);
              
              const embed = new EmbedBuilder()
                  .setTitle('🏆 Contest Entries')
                  .setColor('#00ff88') // Light green
                  .setFooter({ text: `Page ${page + 1} of ${maxPages + 1}` });
  
              if (entries.length === 0) {
                  embed.setDescription('No entries found.');
              } else {
                  entries.forEach((entry, index) => {
                      embed.addFields({
                          name: `#${start + index + 1}`,
                          value: `${entry.embed.description || "*No description*"}\n🔗 [View Entry](${entry.msgLink})\n🔼 : **${entry.likes}** - 🔽 : **${entry.dislikes}** | (Score: **${entry.score}**)`,
                      });
                  });
              }
  
              return embed;
          };
  
          const getButtons = () => new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                  .setCustomId('prev')
                  .setLabel('Previous')
                  .setStyle(ButtonStyle.Primary)
                  .setDisabled(currentPage === 0),
              new ButtonBuilder()
                  .setCustomId('next')
                  .setLabel('Next')
                  .setStyle(ButtonStyle.Primary)
                  .setDisabled(currentPage >= maxPages),
          );
  
          const message = await interaction.reply({
              embeds: [generateEmbed(currentPage)],
              components: [getButtons()],
              fetchReply: true,
          });
  
          const collector = message.createMessageComponentCollector({ time: 60000 });
  
          collector.on("collect", async (button) => {
              if (button.user.id !== interaction.user.id) return;
  
              if (button.customId === "prev" && currentPage > 0) {
                  currentPage--;
              } else if (button.customId === "next" && currentPage < maxPages) {
                  currentPage++;
              }
  
              await button.update({
                  embeds: [generateEmbed(currentPage)],
                  components: [getButtons()],
              });
          });
      }
  };
  