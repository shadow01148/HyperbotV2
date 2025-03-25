import {
  REST,
  Routes,
  Client,
  Events,
  GatewayIntentBits,
  Collection,
  MessageFlags,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { token, mongoDBConnection,  } from "./config.json";
import { promises as fs } from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import noblox from "noblox.js";
import logger from "./utils/logger";

interface ExtendedClient extends Client {
  commands: Collection<string, any>;
  cooldowns: Collection<string, any>;
}

const mongoClient = new MongoClient(mongoDBConnection, {});

const client: ExtendedClient = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
}) as ExtendedClient;

client.commands = new Collection();
client.cooldowns = new Collection();

// Load commands
const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
const foldersPath = path.join(__dirname, "commands");
async function loadCommands() {
  try {
    const commandFolders = await fs.readdir(foldersPath);
    for (const folder of commandFolders) {
      const commandsPath = path.join(foldersPath, folder);
      const commandFiles = (await fs.readdir(commandsPath)).filter((file) =>
        file.endsWith(".js"),
      );

      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = await import(filePath); // No need for "file://"

        if (command.default?.data && command.default?.execute) {
          client.commands.set(command.default.data.name, command.default);
          // debug
          logger.debug(`Command loaded: ${command.default.data.name}`);
          logger.debug(`Command path: ${filePath}`);
          logger.debug(`Command data:`, command.default.data.toJSON());
          logger.debug(`Command execute:`, command.default.execute);
          commands.push(command.default.data.toJSON()); // Add this line to register the command
        } else {
          logger.warn(
            `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
          );
        }
      }
    }
  } catch (error) {
    console.error(`Error loading commands: ${error}`);
  }
}

loadCommands();

client.once(Events.ClientReady, async (readyClient) => {
  logger.info(`Ready! Logged in as ${readyClient.user.tag}`);

  // Register commands after client is ready
  const rest = new REST().setToken(token);
  try {
    logger.info("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(readyClient.user.id), {
      body: commands,
    });
  } catch (error) {
    logger.error(error);
  }
});

client.on(Events.MessageCreate, async (message) => {
    const imageRegex = /\b(?:send|upload|share|attach|post|submit|provide|drop)\s+(?:an?\s+)?(?:images?|photos?|pictures?|pics?|pix|screenshots?|snapshots?|files?|img(?:s|es)?|fotos?)\b/i;
    const questionRegex = /^(?:how|can|is|are|was|were|what|where|who|whom|whose|which|do|does|did|should|could|would|will|shall|has|have|had|must|am|why|when)\b/i;
    const reportRegex = /\b(?:how\s+(?:do|can|does)|where(?:\s+(?:can|do|to))?|what'?s?(?:\s+(?:the|way))?|can|is)\s+(?:i|we|one|you)\s+(?:report|file|make|submit|flag|notify)\s+(?:an?\s+)?(?:report|complaint|issue)?\s*(?:on|about|against|for)?\s*(?:a|this|that|the)?\s*(?:player|user|cheater|hacker|scammer|offender|abuser|violator|toxic\s+player|someone)\b/i;
    const suggestRegex = /\b(?:how\s+(?:do|can|does)|where(?:\s+(?:can|do|to))?|what'?s?(?:\s+(?:the|way))?|can|is)\s+(?:i|we|one|you)\s+(?:suggest|make|submit|give|propose|provide|request|recommend)\s+(?:an?\s+)?(?:suggestion|idea|feature|feedback|recommendation|request|improvement|change|addition)\b/i;
    if (suggestRegex.test(message.content)) {
        await message.reply("You need to be **Ranked** to submit suggestions. If you meet the requirements, you can suggest using the `&suggest <suggestion>` command in <#384027830192832513>.");
    }
    if (reportRegex.test(message.content)) {
        await message.reply("Ingame reports are not handled by the moderation team. Please report the user in-game using the ROBLOX report feature, or on the Roblox website.");
    }
    if (questionRegex.test(message.content) && imageRegex.test(message.content)) {
        await message.reply("A user can only upload images in #general if they are:\n- Expert Ranked\n. If you do not have the Expert rank, you can upload images in any other channel if you have:\n- Level 3 in MEE6");
    }
// ANYTHING AFTER THIS LINE IS RELATED TO CONTESTS.
  const contestCreationsId = "1353535051626844201";
  const contestSubmissionsId = "1353572359340294266";
  if (message.channel.id === contestCreationsId) {
    await message.react("👍");
    await message.react("👎");
  }
  if (message.channel.id === contestSubmissionsId) {
    if (!message.guild) return;
    // extract links from message.content
    const links = message.content.match(/https?:\/\/[^\s]+/g) || [];
    if (links.length === 0 && message.attachments.size === 0) return;
    logger.debug(message.url)
    const channel = message.guild.channels.cache.get(contestCreationsId);
    const embed: EmbedBuilder = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("Submission")
      // add a source link
      .setURL(message.url)
      .setDescription(message.content || "No description")
      .setFooter({
        text: `Submitted by ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL(),
      })
      .setTimestamp();
      if (message.attachments.size > 0) {
        embed.setImage(message.attachments.first()?.url ?? null);
      } else if (links.length > 0) {
        embed.setImage(links[0] ?? null);
    }
     

    if (channel && channel.type === 0) {
      await (channel as TextChannel).send({ embeds: [embed] });
    }
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  try {
    const database = mongoClient.db("HyperVerify");
    const collection = database.collection("verifiedUsers");

    // Filter out the @everyone role and map the remaining roles to their IDs
    const rolesToSave = member.roles.cache
      .filter((role) => role.name !== "@everyone") // Exclude @everyone
      .map((role) => role.id);

    // If no roles are left after filtering, skip saving
    if (rolesToSave.length === 0) {
      logger.debug(
        `User ${member.id} (${member.user.tag}) has no roles to save. Skipping role save.`,
      );
      return;
    }

    // Find the user in the database
    const user = await collection.findOne({ _id: new ObjectId(member.id) });

    if (user) {
      // Update the user's roles in the database
      await collection.updateOne(
        { _id: new ObjectId(member.id) },
        { $set: { ranks: rolesToSave } },
      );
      logger.debug(
        `Roles saved for user ${member.id} (${member.user.tag}):`,
        rolesToSave,
      );
    } else {
      logger.debug(
        `User ${member.id} (${member.user.tag}) not found in the database.`,
      );
    }
  } catch (error) {
    logger.error("Error handling GuildMemberRemove event:", error);
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const database = mongoClient.db("HyperVerify");
    const collection = database.collection("verifiedUsers");

    // Find the user in the database
    const user = await collection.findOne({ _id: new ObjectId(member.id) });

    if (user) {
      // Assign the "verified" role
      const verifiedRole = member.guild.roles.cache.find(
        (role) => role.name === "Verified",
      );
      if (verifiedRole) {
        await member.roles.add(verifiedRole);
        logger.debug(
          `Assigned "Verified" role to user ${member.id} (${member.user.tag})`,
        );
      } else {
        logger.warn(`"Verified" role not found in the guild.`);
      }

      // Assign saved roles
      if (user["ranks"] && user["ranks"].length > 0) {
        const rolesToAdd = user["ranks"].filter((roleId: string) =>
          member.guild.roles.cache.has(roleId),
        ); // Ensure roles exist in the guild
        await member.roles.add(rolesToAdd);
        logger.debug(
          `Assigned saved roles to user ${member.id} (${member.user.tag}):`,
          rolesToAdd,
        );
      }

      const username = await noblox.getUsernameFromId(user["robloxId"]);
      await member.setNickname(username);

      logger.debug(
        `User ${member.id} (${member.user.tag}) has been verified and roles restored.`,
      );
    } else {
      logger.debug(
        `User ${member.id} (${member.user.tag}) not found in the database. Skipping verification.`,
      );
    }
  } catch (error) {
    logger.error(
      `Error handling GuildMemberAdd event for user ${member.id} (${member.user.tag}):`,
      error,
    );
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { cooldowns } = interaction.client as ExtendedClient;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  if (!cooldowns.has(command.data.name)) {
    cooldowns.set(command.data.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name);
  const defaultCooldownDuration = 3;
  const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1_000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

    if (now < expirationTime) {
      const expiredTimestamp = Math.round(expirationTime / 1_000);
      // check if a message has been sent already
      if (!interaction.replied) {
        await interaction.reply({
          content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
        })
      } else {
        await interaction.editReply({
          content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
        });
      }
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  if (!command) {
    logger.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  if (interaction) {
    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }
});

client.on(Events.Error, (error) => {
  logger.error(error);
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  const hofVotingChannelId = "1353627970962722877";
  if (reaction.message.channel.id === hofVotingChannelId) {
    if (reaction.emoji.name === "👍") {
      const channel = reaction.message.channel;
      if (channel.type === 0) {
        const message = reaction.message;
        const reactions = message.reactions.cache;
        const upvotes = reactions.get("👍")?.count || 0;
        const downvotes = reactions.get("👎")?.count || 0;
        if (upvotes - downvotes >= 8) {
          const hofChannelId = "1353627930026311681";
          const hofChannel = message.guild?.channels.cache.get(hofChannelId);
          if (!message.author) return;
          const images = message.attachments.map(
            (attachment) => attachment.url,
          );
          if (images.length === 0) return;
          if (hofChannel && hofChannel.type === 0) {
            const embed = new EmbedBuilder()
              .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL(),
              })
              .setDescription(message.content)
              .setImage(images[0])
              .setFooter({ text: `Submitted by ${message.author.tag}` })
              .setTimestamp();
            await hofChannel.send({ embeds: [embed] });
          }
        }
      }
    }
  }
});

client.login(token);
