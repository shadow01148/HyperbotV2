import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  MessageFlags,
  ChatInputCommandInteraction,
} from "discord.js";
import {
  verifyRole,
  mongoDBConnection,
  ROBLOSECURITY,
} from "../../config.json";
import { MongoClient, ObjectId } from "mongodb";
import noblox from "noblox.js";
import { promises as fs } from "fs";
import path from "path";
import logger from "../../utils/logger";

const client = new MongoClient(mongoDBConnection, {});

function generateVerificationCode() {
  const words = [
    "apple",
    "banana",
    "cherry",
    "date",
    "elderberry",
    "fig",
    "grape",
    "honeydew",
    "kiwi",
    "lemon",
    "mango",
    "nectarine",
    "orange",
    "pear",
    "quince",
    "raspberry",
    "strawberry",
    "tangerine",
    "watermelon",
  ];
  const wordCount = 5;

  for (let i = words.length - 1; i >= wordCount; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const wordI = words[i];
    const wordJ = words[j];
    if (wordI !== undefined && wordJ !== undefined) {
      [words[i], words[j]] = [wordJ, wordI]; // Swap elements
    }
  }
  return words.slice(-wordCount).join(" ");
}

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription(
      "Verify and link your Roblox account to your Discord account.",
    )
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Your Roblox username.")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await client.connect();
    const database = client.db("HyperVerify");
    const collection = database.collection("verifiedUsers");
    const username = interaction.options.getString("username");
    if (!username) {
      await interaction.reply({
        content: "Username is required.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    var message = await interaction.reply({ content: "Hold Tight..." });

    const id = await noblox.getIdFromUsername(username);

    const discordId = interaction.user.id;
    // eslint-disable-next-line no-undef
    const configPath = path.join(__dirname, "../../config.json");
    const config = JSON.parse(await fs.readFile(configPath, "utf8"));

    if (config.blacklistedIds.includes(discordId)) {
      await interaction.reply({
        content: "❌ This user is blacklisted from verification.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = await collection.findOne({
      _id: discordId as unknown as ObjectId,
    });
    const ranks = user?.["roles"] || [];
    if (user) {
      if (user["robloxId"] === id) {
        await message.edit({
          content: `You are already verified under the same username.`,
          components: [],
          embeds: [],
        });
      }
      const reverifyConfirmation = new EmbedBuilder()
        .setTitle("Reverify")
        .setDescription(
          "You are already verified. Would you like to reverify? This message will timeout in `10 seconds`.",
        )
        .setColor("Blurple");
      const yes = new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setLabel("Yes")
        .setCustomId("yes");
      await message.edit({
        embeds: [reverifyConfirmation],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(yes)],
      });
      const filter = (i: { customId: string; user: { id: string } }) =>
        i.customId === "yes" && i.user.id === interaction.user.id;
      if (!interaction.channel) return;
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 10000,
      });
      // if yes, continue to the code. if expried, return
      collector.on("collect", async (i) => {
        if (i.customId === "yes") {
          await message.edit({
            content: "Reverifying...",
            components: [],
            embeds: [],
          });
          await verify(interaction);
          return;
        }
      });
    } else {
      await verify(interaction);
    }
    async function verify(interaction: ChatInputCommandInteraction) {
      /** @param {import('discord.js').ButtonBuilder}*/
      const done = new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setLabel("Done")
        .setCustomId("done");

      const verificationCode = generateVerificationCode();

      const embed = new EmbedBuilder()
        .setTitle("HyperVerify Rewrite Request")
        .setDescription(
          `Please enter the following code in your Roblox profile's description:\n \`${verificationCode}\` \n\nOnce you have done this, click the button below.`,
        )
        .setColor("Blurple")
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(done);

      const dMessage = await interaction.user.send({
        embeds: [embed],
        components: [row],
      });
      await message.edit({ content: "Check your DMs!", components: [] });

      const filter = (i: { customId: string; user: { id: string } }) =>
        i.customId === "done" && i.user.id === interaction.user.id;
      if (!interaction.user.dmChannel) return;
      const collector =
        interaction.user.dmChannel.createMessageComponentCollector({
          filter,
          time: 60000,
        });
      collector.on("collect", async (i) => {
        try {
          if (i.customId === "done") {
            await i.deferUpdate(); // Acknowledge interaction to prevent timeout

            const logIn = await noblox.setCookie(ROBLOSECURITY);
            logger.debug(`Logged in as ${logIn.name}`);

            const user = await noblox.getUserInfo(id);
            const description = user.description;
            logger.debug(description);
            logger.debug(verificationCode);

            if (description === verificationCode) {
              embed.setDescription(
                "Verification successful. You now have access to the server.",
              );
              done.setDisabled(true);
              await dMessage.edit({
                embeds: [embed],
                components: [
                  new ActionRowBuilder<ButtonBuilder>().addComponents(done),
                ],
              });

              if (interaction.member && "add" in interaction.member.roles) {
                await interaction.member.roles
                  .add(verifyRole)
                  .catch(logger.error);
              }

              const database = client.db("HyperVerify");
              const collection = database.collection("verifiedUsers");
              await collection.updateOne(
                { _id: discordId as unknown as ObjectId },
                { $set: { robloxId: id, ranks: ranks } },
                { upsert: true },
              );

              if (interaction.member && "setNickname" in interaction.member) {
                await interaction.member.setNickname(user.name);
              }
            } else {
              embed.setDescription(
                "Verification failed. Please make sure you have entered the correct code in your Roblox profile description.",
              );
              done.setDisabled(true);
              await dMessage.edit({
                embeds: [embed],
                components: [
                  new ActionRowBuilder<ButtonBuilder>().addComponents(done),
                ],
              });
            }
          }
        } catch (error) {
          logger.debug(error);
        }
      });
    }
  },
};
