import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ChatInputCommandInteraction,
} from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("hof")
        .setDescription("Hall of Fame related commands")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("Add a message to the Hall of Fame.")
                .addStringOption((option) =>
                    option.setName("messageid").setDescription("Select a message ID"),
                ),
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const creationsChannelId = "1353572359340294266";
        const creationsChannel = await interaction.guild?.channels.fetch(creationsChannelId);
        const hofChannelId = "1353627970962722877";
        const hofChannel = await interaction.guild?.channels.fetch(hofChannelId);
        if (!hofChannel) return;
        const messageId = interaction.options.getString("messageid");
        if (!messageId) {
            await interaction.reply("Message ID is required.");
            return;
        }
        if (creationsChannel && creationsChannel.type === 0) {
            const message = await creationsChannel?.messages.fetch(messageId);
            if (!message) {
                await interaction.reply("Message not found.");
                return;
            }
            // get images from the message
            const images = message.attachments.map((attachment) => attachment.url);
            if (images.length === 0) {
                await interaction.reply("Message does not have any images.");
                return;
            }
            const embed = new EmbedBuilder()
                .setAuthor({
                    name: message.author.tag,
                    iconURL: message.author.displayAvatarURL(),
                })
                .setDescription("Should this creation be added to the Hall of Fame?")
                .setImage(images[0]);
            if (hofChannel && hofChannel.type === 0) {
                const sendMessage = await hofChannel.send({ embeds: [embed] });
                await sendMessage.react("👍");
                await sendMessage.react("👎");
            }
            await interaction.reply(
                "Message added to the Hall of Fame voting channel.",
            );
        }
    }
}