// refresh vip server links
import { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction } from 'discord.js';
import {promises as fs} from 'fs';
import logger from '../../utils/logger';

export default {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Refresh VIP server links.')
        .addStringOption(option =>
            option.setName("vip1")
            .setDescription("VIP 1 server link.")
            .setRequired(false)
        )
        .addStringOption(option =>
            option.setName("vip2")
            .setDescription("VIP 2 server link.")
            .setRequired(false)
        )
        .addStringOption(option =>
            option.setName("expertvip1")
            .setDescription("Expert VIP 1 server link.")
            .setRequired(false)
        )
        .addStringOption(option =>
            option.setName("expertvip2")
            .setDescription("Expert VIP 2 server link.")
            .setRequired(false)
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const vip1 = interaction.options.getString("vip1")
        const vip2 = interaction.options.getString("vip2")
        const expertvip1 = interaction.options.getString("expertvip1")
        const expertvip2 = interaction.options.getString("expertvip2")
        try {
            const data = await fs.readFile('config.json', 'utf8');
            const config = JSON.parse(data);
            if (vip1) config.servers.vipLink1 = vip1;
            if (vip2) config.servers.vipLink2 = vip2;
            if (expertvip1) config.servers.expertLink1 = expertvip1;
            if (expertvip2) config.servers.expertLink2 = expertvip2;
            await fs.writeFile('config.json', JSON.stringify(config, null, 2));
            await interaction.reply({ content: `VIP server links refreshed!`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            logger.error("Error refreshing VIP server links:", error);
            await interaction.reply({content: `An error occurred while refreshing VIP server links.`, flags: MessageFlags.Ephemeral });
        }
    }
};
