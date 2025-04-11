import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ChatInputCommandInteraction,
} from "discord.js";
import { promises as fs } from "fs";
import logger from "../../utils/logger";
import { HttpClient } from "../../utils/httpsHandler";

interface ServerResponse {
    data: { id: string, name: string, accessCode: string }[];
}

export default {
    data: new SlashCommandBuilder()
        .setName("vips")
        .setDescription("VIP related commands")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("reload")
                .setDescription("Reloads the VIP servers."),
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const data = await fs.readFile("config.json", "utf8");
            const config = JSON.parse(data);

            const serverAccessCodes = [];
            const serverIds = [];
            const servers = await HttpClient.get<ServerResponse>("https://games.roblox.com/v1/games/166986752/private-servers", { headers: { Authorization: `Bearer ${config.ROBLOSECURITY}` } })
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
}