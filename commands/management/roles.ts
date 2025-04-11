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
        .setName("roles")
        .setDescription("Role related commands")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("show")
                .setDescription(`Shows a specific user's roles`)
                .addUserOption((option) =>
                    option.setName("user").setDescription("Select a user"),
                ),
        ),
    async execute(interaction: ChatInputCommandInteraction) {
            if (!interaction.guild) {
                logger.debug("This ran")
                return;
            }
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
            await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral,
            });
        }
    }