import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, ChatInputCommandInteraction, TextChannel } from 'discord.js';

export default {
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

	async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;
        if (!interaction.channel) return;

		const str = interaction.options.getString("string");
        if (!str) {
            await interaction.reply({ content: 'String is required.', flags: MessageFlags.Ephemeral });
            return;
        }
        const channel = interaction.options.getChannel("channel") || await interaction.guild.channels.fetch(interaction.channel.id);

        await interaction.reply({ content: 'Message sent.', flags: MessageFlags.Ephemeral });

        // Ensure the channel is a TextChannel before sending the message
        if (channel && channel.type === 0) { // 0 is for GuildText channels in v14
            await (channel as TextChannel).send(str);
        }
	},
};
