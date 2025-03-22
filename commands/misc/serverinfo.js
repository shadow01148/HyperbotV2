// @ts-check
const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Displays information about the server."),
    

    /**
     * @param {{ guild: { guild: any; }; reply: (arg0: { embeds: EmbedBuilder[]; }) => any; }} interaction
     */
    async execute(interaction) {
        const { guild } = interaction.guild;

        const owner = await guild.fetchOwner();
        
        const textChannels = guild.channels.cache.filter((/** @type {{ type: ChannelType; }} */ c) => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter((/** @type {{ type: ChannelType; }} */ c) => c.type === ChannelType.GuildVoice).size;
        const roleCount = guild.roles.cache.size;
        const memberCount = guild.memberCount;
        
        const createdAt = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`;

        const embed = new EmbedBuilder()
            .setColor(0x1f8b4c)
            .setTitle(guild.name)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .addFields(
                {name: "Members", value: `${memberCount}`, inline: true},
                { name: "Owner", value: `${owner}`, inline: true},
                { name: "Text Channels", value: `${textChannels}`, inline: true },
                { name: "Voice Channels", value: `${voiceChannels}`, inline: true },
                { name: "Roles", value: `${roleCount}`, inline: true },
                { name: "Created", value: createdAt, inline: false }
            )
            .setImage(guild.bannerURL({ size: 1024 }) || null)
            .setFooter({ text: `Server ID: ${guild.id} • ${new Date().toLocaleString()}` });

        await interaction.reply({ embeds: [embed] });
    }
};
