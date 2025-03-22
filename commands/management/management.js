/* eslint-disable no-undef */
//@ts-check
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const noblox = require('noblox.js');
const { mongoDBConnection, verifyRole } = require('../../config.json');
const { MongoClient } = require('mongodb');

const client = new MongoClient(mongoDBConnection, {});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage')
        .setDescription('Management commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addSubcommandGroup(group =>
            group
                .setName('rankrequest')
                .setDescription('Rank Requests commands')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('Lists rank request tickets')
                )
        )
        .addSubcommandGroup(group =>
            group 
                .setName('verify')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("check")
                        .setDescription("Check the verification status of a user.")
                        .addUserOption(user =>
                            user 
                                .setName("user")
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("blacklist")
                        .setDescription("Blacklists a user from verifying, and deletes their entry in the database if it exists.")
                        .addUserOption(user =>
                            user 
                                .setName("user")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                    .setName("manual")
                    .setDescription("Manually verifies a user.")
                    .addUserOption(user =>
                        user 
                            .setName("user")
                            .setRequired(true)
                    )
                    .addStringOption(user =>
                        user
                            .setName("id")
                            .setDescription("Specify a roblox ID to allocate the user to.")
                    )
                )
        ),



    /**
     * @param {{ options: { getSubcommandGroup: () => any; getSubcommand: () => any; getUser: (arg0: string) => any; getString: (arg0: string) => any; }; user: { id: any; }; reply: (arg0: { content?: string; embeds?: EmbedBuilder[]; ephemeral?: boolean; components?: ActionRowBuilder<import("discord.js").AnyComponentBuilder>[]; fetchReply?: boolean; }) => any; member: { roles: { add: (arg0: string) => Promise<any>; }; setNickname: (arg0: any) => any; }; editReply: (arg0: { components: never[]; }) => any; }} interaction
     */
    async execute(interaction) {
        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        if (subcommandGroup === 'verify') {
            if (subcommand === 'check') {
                await client.connect();
                const database = client.db('HyperVerify');
                const collection = database.collection('verifiedUsers');
            
                const targetUser = interaction.options.getUser("user") || interaction.user;
                const discordId = targetUser.id;
            
                const userData = await collection.findOne({ _id: discordId });

                if (!userData) {
                    await interaction.reply({content: "No user found in the database."})
                    return;
                }
                const user = await noblox.getUserInfo(userData['robloxId'])
                const createdDate = new Date(user.created);
                const accountAge = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            
                const embed = new EmbedBuilder()
                .setTitle("✅ Verification Status")
                .addFields(
                    { name: "👤 Username", value: user.name, inline: true },
                    { name: "📅 Account Age", value: `${accountAge} days`, inline: true },
                )
                .setColor("Green")
                .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${userData['robloxId']}&width=420&height=420&format=png`)
                .setTimestamp();
            
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return
            } 
            if (subcommand === "blacklist") {
                await client.connect();
                const database = client.db('HyperVerify');
                const collection = database.collection('verifiedUsers');
            
                const targetUser = interaction.options.getUser("user");
                const discordId = targetUser.id;

                const userData = await collection.findOne({ _id: discordId });

                if (userData) {
                    await collection.deleteOne({ _id: discordId });
                }

                const configPath = path.join(__dirname, '../../config.json');
                const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

                if (!config.blacklistedIds.includes(discordId)) {
                    config.blacklistedIds.push(discordId);
                    await fs.writeFile(configPath, JSON.stringify(config, null, 4));
                    await interaction.reply({ content: `✅ User <@${discordId}> has been blacklisted from verifying.`, ephemeral: true });
                } else {
                    await interaction.reply({ content: "❌ This user is already blacklisted.", ephemeral: true });
                }
            }
            if (subcommand === "manual") {
                await client.connect();
                const database = client.db('HyperVerify');
                const collection = database.collection('verifiedUsers');
            
                const targetUser = interaction.options.getUser("user");
                const targetRobloxId = Number(interaction.options.getString("id"))
                const discordId = targetUser.id;

                const userData = await collection.findOne({ _id: discordId });
                const user = await noblox.getUserInfo(targetRobloxId)

                if (userData) {
                    await interaction.reply({content: "The user you have applied is already verified."})
                    return;
                }
                await interaction.member.roles.add(verifyRole).catch(console.error);
                await interaction.member.setNickname(user.name)
                await collection.insertOne({_id: discordId, robloxId: user.id, ranks: []})
                await interaction.reply({content: "User successfully added to the database."})

            }
        }
        if (subcommandGroup === 'rankrequest' && subcommand === 'list') {    
            const ticketsDataPath = path.join(__dirname, '..', '..', 'ticketsData.json'); // Adjust as needed
            const ticketsData = JSON.parse(await fs.readFile(ticketsDataPath, 'utf8'));
            const ticketEntries = Object.entries(ticketsData);

            if (ticketEntries.length === 0) {
                return await interaction.reply({ content: 'No open rank request tickets found.', ephemeral: true });
            }

            const ticketsPerPage = 5;
            let currentPage = 0;
            const totalPages = Math.ceil(ticketEntries.length / ticketsPerPage);

            /**
             * @param {number} page
             */
            function generateEmbed(page) {
                const start = page * ticketsPerPage;
                const end = start + ticketsPerPage;
                const ticketList = ticketEntries.slice(start, end);

                const embed = new EmbedBuilder()
                    .setTitle("📜 Rank Request Tickets")
                    .setColor("#2ECC71") // Light green color
                    .setDescription(
                        ticketList.map(([ticketId, ticketData]) => {
                            return `📝 **Rank Request Ticket ID:** ${ticketId}
👤 **Requested by:** <@${ticketData.authorId}>
🔹 **Rank requesting for:**
${ticketData.ranks.length > 0 ? `- ${ticketData.ranks.join('\n- ')}` : "❌ No data available."}
📦 **Block Count:** ${ticketData.blockCount}
👍 **Upvotes:** ${ticketData.upvoteCount} | 👎 **Downvotes:** ${ticketData.downvoteCount}`;
                        }).join("\n\n")
                    )
                    .setFooter({ text: `Page ${page + 1} of ${totalPages} • Total: ${ticketEntries.length} tickets` });

                return embed;
            }

            // Pagination buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('⬅️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === totalPages - 1)
                );

            const message = await interaction.reply({ embeds: [generateEmbed(currentPage)], components: [row], fetchReply: true });

            const collector = message.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async (/** @type {{ user: { id: any; }; reply: (arg0: { content: string; ephemeral: boolean; }) => any; customId: string; update: (arg0: { embeds: EmbedBuilder[]; components: ActionRowBuilder<import("discord.js").AnyComponentBuilder>[]; }) => any; }} */ buttonInteraction) => {
                if (buttonInteraction.user.id !== interaction.user.id) {
                    return buttonInteraction.reply({ content: "❌ You're not allowed to use this button!", ephemeral: true });
                }

                if (buttonInteraction.customId === 'prev' && currentPage > 0) currentPage--;
                else if (buttonInteraction.customId === 'next' && currentPage < totalPages - 1) currentPage++;

                await buttonInteraction.update({
                    embeds: [generateEmbed(currentPage)],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('prev')
                                    .setLabel('⬅️')
                                    .setStyle(ButtonStyle.Primary)
                                    .setDisabled(currentPage === 0),
                                new ButtonBuilder()
                                    .setCustomId('next')
                                    .setLabel('➡️')
                                    .setStyle(ButtonStyle.Primary)
                                    .setDisabled(currentPage === totalPages - 1)
                            )
                    ]
                });
            });

            collector.on('end', async () => {
                await interaction.editReply({ components: [] });
            });
        }
    }
};
