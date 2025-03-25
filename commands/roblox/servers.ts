import {
  SlashCommandBuilder,
  MessageFlags,
  ChatInputCommandInteraction,
} from "discord.js";
import { rankedRole, servers } from "../../config.json";

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("servers")
    .setDescription("Get the list of VIP and expert servers."),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    if (!interaction.member) {
      return await interaction.followUp({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (
      !("cache" in interaction.member.roles) ||
      !interaction.member.roles.cache.has(rankedRole)
    ) {
      return await interaction.followUp({
        content:
          "You are not ranked! You must be ranked to access our VIP servers.",
        flags: MessageFlags.Ephemeral,
      });
    }
    await interaction.followUp(`<@${interaction.user.id}>, Check your DMs!`);
    // list down servers in categories with formatting
    const serverMessage = `**PCC VIP SERVERS**
    -----------------------
    These private servers are a place where you can build without having to worry about someone potentially copying your creation! These private servers are meant for Plane Crazy Community Discord members only.

    | VIP1: ${servers.vipLink1}
    | VIP2: ${servers.vipLink2}

    **EXPERT SERVERS**
    ----------------------
    These servers are exclusively for members with expert-level ranks.

    | EXP1: ${servers.expertLink1}
    | EXP2: ${servers.expertLink2}

    ⚠️ Those found sharing private server links to anyone outside the PCC Discord or to unranked members will be banned.`;

    await interaction.user.send(serverMessage);
    return;
  },
};
