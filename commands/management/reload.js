const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reloads server lists for Hyperbot.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(option =>
            option
                .setName("viplink")
                .setDescription("VIP 1")
        )
        .addStringOption(option =>
            option
                .setName("viplinks")
                .setDescription("VIP 2")
        )
        .addStringOption(option =>
            option
                .setName("expertvip")
                .setDescription("EXPERT VIP 1")
        )
        .addStringOption(option =>
            option
                .setName("expertvips")
                .setDescription("EXPERT VIP 2")
        )
};
