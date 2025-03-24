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
} from "discord.js";
import { promises as fs } from "fs";
import path from "path";
import noblox from "noblox.js";
import { MongoClient, ObjectId } from "mongodb";
import { mongoDBConnection } from "../../config.json";
import logger from "../../utils/logger";

const client = new MongoClient(mongoDBConnection, {});

interface TicketData {
  authorId: string;
  ranks: string[];
  blockCount: number;
  upvoteCount: number;
  downvoteCount: number;
}

export default {
  data: new SlashCommandBuilder()
    .setName("manage")
    .setDescription("Management commands")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
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
        ),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

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
