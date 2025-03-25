import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  MessageFlags,
  ChatInputCommandInteraction,
  ButtonInteraction,
  TextChannel,
} from "discord.js";
import { promises as fs } from "fs";
import path from "path";
import noblox from "noblox.js";
import { MongoClient, ObjectId } from "mongodb";
import { mongoDBConnection } from "../../config.json";
import logger from "../../utils/logger";
import { HttpClient } from "../../utils/httpsHandler";

const client = new MongoClient(mongoDBConnection, {});

interface TicketData {
  authorId: string;
  ranks: string[];
  blockCount: number;
  upvoteCount: number;
  downvoteCount: number;
}

interface ServerResponse {
    data: { id: string, name: string, accessCode: string }[];
}

export default {
  data: new SlashCommandBuilder()
    .setName("manage")
    .setDescription("Management commands")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addSubcommandGroup((group) =>
        group
            .setName("vips")
            .setDescription("VIP related commands")
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("reload")
                    .setDescription("Reloads the VIP servers."),
            ),
        )
    .addSubcommandGroup((group) =>
        group
            .setName("contest")
            .setDescription("Contest related commands")
            .addSubcommand((subcommand) =>
                subcommand
                  .setName("top")
                  .setDescription("Displays the top upvoted contest entries."),
              ),
            )
    .addSubcommandGroup((group) =>
        group
            .setName("hof")
            .setDescription("Hall of Fame related commands")
            .addSubcommand((subcommand) =>
                subcommand
                .setName("add")
                .setDescription("Add a message to the Hall of Fame.")
                .addStringOption((option) =>
                option.setName("messageid").setDescription("Select a message ID"),
            ),
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("roles")
        .setDescription("Role related commands")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("show")
            .setDescription(`Shows a specific user's roles`)
            .addUserOption((option) =>
              option.setName("user").setDescription("Select a user"),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("rankrequest")
        .setDescription("Rank Requests commands")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("list")
            .setDescription("Lists rank request tickets"),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("verify")
        .setDescription("Verification related commands") // Added missing description
        .addSubcommand((subcommand) =>
          subcommand
            .setName("check")
            .setDescription("Check the verification status of a user.")
            .addUserOption((user) =>
              user.setName("user").setDescription("Select a user."),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("blacklist")
            .setDescription(
              "Blacklists a user from verifying, and deletes their entry in the database if it exists.",
            )
            .addUserOption((user) =>
              user
                .setName("user")
                .setDescription("Select a user.")
                .setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("manual")
            .setDescription("Manually verifies a user.")
            .addUserOption((user) =>
              user
                .setName("user")
                .setDescription("Select a user.")
                .setRequired(true),
            )
            .addStringOption((user) =>
              user
                .setName("id")
                .setDescription("Specify a roblox ID to allocate the user to.")
                .setRequired(true),
            ),
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    if (subcommandGroup === "contest" && subcommand === "top") {
            if (!interaction.guild) return;
            const creationsPerPage = 5;
            let currentPage = 0;
            const channel = interaction.guild.channels.cache.get("1353535051626844201");
        
            if (!channel || channel.type !== 0) return;
        
            const messages = await (channel as TextChannel).messages.fetch({
              limit: 100,
            });
            let embeds = messages
              .filter((msg) => msg.embeds.length > 0)
              .map((msg) => {
                const embed = msg.embeds[0];
                const likes = msg.reactions.cache.get("👍")?.count || 0;
                const dislikes = msg.reactions.cache.get("👎")?.count || 0;
                const score = likes - dislikes;
                return { embed, likes, dislikes, score, msgLink: msg.url };
              });
        
            embeds.sort((a, b) => b.score - a.score);
        
            const maxPages = Math.max(
              Math.ceil(embeds.length / creationsPerPage) - 1,
              0,
            );
        
            const generateEmbed = (page: number) => {
              const start = page * creationsPerPage;
              const end = start + creationsPerPage;
              const entries = embeds.slice(start, end);
        
              const embed = new EmbedBuilder()
                .setTitle("🏆 Contest Entries")
                .setColor("#00ff88") // Light green
                .setFooter({ text: `Page ${page + 1} of ${maxPages + 1}` });
        
              if (entries.length === 0) {
                embed.setDescription("No entries found.");
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
        
            const getButtons = () =>
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
                  .setDisabled(currentPage >= maxPages),
              );
        
            const message = await interaction.reply({
              embeds: [generateEmbed(currentPage)],
              components: [getButtons()],
              withResponse: true,
            });
            if (!message.resource?.message) return;
            const collector = message.resource?.message.createMessageComponentCollector({ time: 60000 });
        
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
        

    if (subcommandGroup === "hof" && subcommand === "add") {
        const creationsChannelId = "1353572359340294266";
        const creationsChannel = await interaction.guild?.channels.fetch(creationsChannelId);
        const hofChannelId = "1353627970962722877";
        const hofChannel = await interaction.guild?.channels.fetch(hofChannelId);
        if (!hofChannel) return;
        const messageId = interaction.options.getString("messageid");
        if (!messageId) {
          await interaction.reply("Message ID is required.");
          return;
        }
        if (creationsChannel && creationsChannel.type === 0) {
          const message = await creationsChannel?.messages.fetch(messageId);
          if (!message) {
            await interaction.reply("Message not found.");
            return;
          }
          const reactions = message.reactions.cache;
          const upvotes = reactions.get("👍")?.count || 0;
          const downvotes = reactions.get("👎")?.count || 0;
    
          // get images from the message
          const images = message.attachments.map((attachment) => attachment.url);
          if (images.length === 0) {
            await interaction.reply("Message does not have any images.");
            return;
          }
          const embed = new EmbedBuilder()
            .setAuthor({
              name: message.author.tag,
              iconURL: message.author.displayAvatarURL(),
            })
            .setDescription("Should this creation be added to the Hall of Fame?")
            .setImage(images[0]);
          if (hofChannel && hofChannel.type === 0) {
            const sendMessage = await hofChannel.send({ embeds: [embed] });
            await sendMessage.react("👍");
            await sendMessage.react("👎");
          }
          await interaction.reply(
            "Message added to the Hall of Fame voting channel.",
          );
        }
    }

    if (subcommandGroup === "vips" && subcommand === "reload") {
        try {
            const data = await fs.readFile("config.json", "utf8");
            const config = JSON.parse(data);
    
            const serverAccessCodes = [];
            const serverIds = [];
            const servers = await HttpClient.get<ServerResponse>("https://games.roblox.com/v1/games/166986752/private-servers", { headers: { Authorization: `Bearer ${config.ROBLOSECURITY}` }})
            if (servers.data.length > 0) {
                for (const server of servers.data) {
                    if (server.name.includes("VIP") || server.name.includes("EXP")) {
                        serverAccessCodes.push(server.accessCode);
                        serverIds.push(server.id);
                    }
                }
            }
            
            for (const serverId of serverIds) {
                const response = await HttpClient.patch<{ status: number, joinCode: string }>(`https://games.roblox.com/v1/private-servers/${serverId}`, {
                    newJoinCode: true,
                }, {
                    headers: { Authorization: `Bearer ${config.ROBLOSECURITY}` }
                });
                if (response.status !== 200) {
                    logger.error(`Failed to refresh VIP server link for server ${serverId}`);
                }
                const file = await fs.readFile("config.json", "utf8");
                const updatedConfig = JSON.parse(file);
                if (serverAccessCodes[0] === response.joinCode) {
                    updatedConfig.servers.vipLink1 = `https://roblox.com/share?code=${response.joinCode}&type=Server`;
                } else if (serverAccessCodes[1] === response.joinCode) {
                    updatedConfig.servers.vipLink2 = `https://roblox.com/share?code=${response.joinCode}&type=Server`;
                } else if (serverAccessCodes[2] === response.joinCode) {
                    updatedConfig.servers.expertLink1 = `https://roblox.com/share?code=${response.joinCode}&type=Server`;
                } else if (serverAccessCodes[3] === response.joinCode) {
                    updatedConfig.servers.expertLink2 = `https://roblox.com/share?code=${response.joinCode}&type=Server`;
                }
                await fs.writeFile("config.json", JSON.stringify(updatedConfig, null, 2));
            }
            await interaction.reply({
              content: `VIP server links refreshed!`,
              flags: MessageFlags.Ephemeral,
            });
          } catch (error) {
            logger.error("Error refreshing VIP server links:", error);
            await interaction.reply({
              content: `An error occurred while refreshing VIP server links.`,
              flags: MessageFlags.Ephemeral,
            });
          }
    }

    if (subcommand === "roles" && subcommandGroup === "show") {
      if (!interaction.guild) return;
      const targetUser =
        interaction.options.getUser("user") || interaction.user;
      const member = await interaction.guild.members.fetch(targetUser.id);

      const roles = member.roles.cache
        .filter((role) => role.id !== interaction.guild!.id)
        .map((role) => role.toString());

      const embed = new EmbedBuilder()
        .setTitle(`🔖 Roles for ${targetUser.tag}`)
        .setDescription(roles.join(", "))
        .setColor("#2ECC71"); // Light green color
      await interaction.followUp({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (subcommandGroup === "verify") {
      if (subcommand === "check") {
        await client.connect();
        const database = client.db("HyperVerify");
        const collection = database.collection("verifiedUsers");

        const targetUser =
          interaction.options.getUser("user") || interaction.user;
        const discordId = targetUser.id;

        const userData = await collection.findOne({
          _id: new ObjectId(discordId),
        });

        if (!userData) {
          await interaction.followUp({
            content: "No user found in the database.",
          });
          return;
        }
        const user = await noblox.getUserInfo(userData["robloxId"]);
        const createdDate = new Date(user.created);
        const accountAge = Math.floor(
          (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        const embed = new EmbedBuilder()
          .setTitle("✅ Verification Status")
          .addFields(
            { name: "👤 Username", value: user.name, inline: true },
            {
              name: "📅 Account Age",
              value: `${accountAge} days`,
              inline: true,
            },
          )
          .setColor("Green")
          .setThumbnail(
            `https://www.roblox.com/headshot-thumbnail/image?userId=${userData["robloxId"]}&width=420&height=420&format=png`,
          )
          .setTimestamp();

        await interaction.followUp({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      if (subcommand === "blacklist") {
        await client.connect();
        const database = client.db("HyperVerify");
        const collection = database.collection("verifiedUsers");

        const targetUser = interaction.options.getUser("user");
        if (!targetUser) {
          await interaction.followUp({
            content: "User not found.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const discordId = targetUser.id;

        const userData = await collection.findOne({
          _id: new ObjectId(discordId),
        });

        if (userData) {
          await collection.deleteOne({ _id: new ObjectId(discordId) });
        }

        const configPath = path.join(__dirname, "../../config.json");
        const config = JSON.parse(await fs.readFile(configPath, "utf8"));

        if (!config.blacklistedIds.includes(discordId)) {
          config.blacklistedIds.push(discordId);
          await fs.writeFile(configPath, JSON.stringify(config, null, 4));
          await interaction.followUp({
            content: `✅ User <@${discordId}> has been blacklisted from verifying.`,
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.followUp({
            content: "❌ This user is already blacklisted.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
      if (subcommand === "manual") {
        if (!interaction.guild) return;
        if (!interaction.member) return;
        await client.connect();
        const database = client.db("HyperVerify");
        const collection = database.collection("verifiedUsers");

        const targetUser = interaction.options.getUser("user");
        if (!targetUser) {
          await interaction.followUp({
            content: "User not found.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const targetRobloxId = Number(interaction.options.getString("id"));
        const discordId = targetUser.id;
        const verifyRole = interaction.guild.roles.cache.find(
          (role) => role.name === "Verified",
        );

        const userData = await collection.findOne({
          _id: new ObjectId(discordId),
        });
        const user = await noblox.getUserInfo(targetRobloxId);

        if (userData) {
          await interaction.followUp({
            content: "The user you have applied is already verified.",
          });
          return;
        }
        const member = interaction.guild.members.cache.get(targetUser.id);
        if (member && verifyRole) {
          await member.roles.add(verifyRole).catch(logger.error);
          await member.setNickname(user.name).catch(logger.error);
        }
        await collection.insertOne({
          _id: new ObjectId(discordId),
          robloxId: user.id,
          ranks: [],
        });
        await interaction.followUp({
          content: "User successfully added to the database.",
        });
      }
    }
    if (subcommandGroup === "rankrequest" && subcommand === "list") {
      const ticketsDataPath = path.join(
        __dirname,
        "..",
        "..",
        "ticketsData.json",
      ); // Adjust as needed
      const ticketsData = JSON.parse(
        await fs.readFile(ticketsDataPath, "utf8"),
      );
      const ticketEntries = Object.entries(ticketsData) as [
        string,
        TicketData,
      ][];

      if (ticketEntries.length === 0) {
        await interaction.followUp({
          content: "No open rank request tickets found.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const ticketsPerPage = 5;
      let currentPage = 0;
      const totalPages = Math.ceil(ticketEntries.length / ticketsPerPage);

      function generateEmbed(page: number) {
        const start = page * ticketsPerPage;
        const end = start + ticketsPerPage;
        const ticketList = ticketEntries.slice(start, end);

        const embed = new EmbedBuilder()
          .setTitle("📜 Rank Request Tickets")
          .setColor("#2ECC71") // Light green color
          .setDescription(
            ticketList
              .map(([ticketId, ticketData]) => {
                return `📝 **Rank Request Ticket ID:** ${ticketId}
👤 **Requested by:** <@${ticketData.authorId}>
🔹 **Rank requesting for:**
${ticketData.ranks.length > 0 ? `- ${ticketData.ranks.join("\n- ")}` : "❌ No data available."}
📦 **Block Count:** ${ticketData.blockCount}
👍 **Upvotes:** ${ticketData.upvoteCount} | 👎 **Downvotes:** ${ticketData.downvoteCount}`;
              })
              .join("\n\n"),
          )
          .setFooter({
            text: `Page ${page + 1} of ${totalPages} • Total: ${ticketEntries.length} tickets`,
          });

        return embed;
      }

      // Pagination buttons
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("⬅️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("➡️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === totalPages - 1),
      );

      const message = await interaction.followUp({
        embeds: [generateEmbed(currentPage)],
        components: [row],
      });

      const collector = message.createMessageComponentCollector({
        time: 60000,
      });

      collector.on(
        "collect",
        async (buttonInteraction: ButtonInteraction): Promise<void> => {
          if (buttonInteraction.user.id !== interaction.user.id) {
            await buttonInteraction.followUp({
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

          await buttonInteraction.update({
            embeds: [generateEmbed(currentPage)],
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId("prev")
                  .setLabel("⬅️")
                  .setStyle(ButtonStyle.Primary)
                  .setDisabled(currentPage === 0),
                new ButtonBuilder()
                  .setCustomId("next")
                  .setLabel("➡️")
                  .setStyle(ButtonStyle.Primary)
                  .setDisabled(currentPage === totalPages - 1),
              ),
            ],
          });
        },
      );

      collector.on("end", async () => {
        await interaction.editReply({ components: [] });
      });
    }
  },
};
