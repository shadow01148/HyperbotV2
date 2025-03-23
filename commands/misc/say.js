const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('say')
		.setDescription('Make the bot say something.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(option =>
            option.setName("string")
            .setDescription("What to make it say.")
            .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName("channel")
            .setDescription("Channel to send it to. This is optional!")
            .setRequired(false)
        ),


	async execute(interaction) {
		const str = interaction.options.getString("string")
        const channel = interaction.options.getChannel("channel") || await interaction.guild.channels.fetch(interaction.channel.id)
        await interaction.reply({ content: 'Message sent.', flags: MessageFlags.Ephemeral });
        if (channel === null) {
            await interaction.send(str)
        } else {
            await channel.send(str)
        }
	},
};