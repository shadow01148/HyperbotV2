// @ts-check
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('say')
		.setDescription('Make the bot say something.')
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


	/**
     * @param {{ options: { getString: (arg0: string) => any; getChannel: (arg0: string) => any; }; reply: (arg0: { content: string; flags: MessageFlags; }) => any; send: (arg0: any) => any; }} interaction
     */
	async execute(interaction) {
		const str = interaction.options.getString("string")
        const channel = interaction.options.getChannel("channel")
        await interaction.reply({ content: 'Message sent.', flags: MessageFlags.Ephemeral });
        if (channel === null) {
            await interaction.send(str)
        } else {
            await channel.send(str)
        }
	},
};