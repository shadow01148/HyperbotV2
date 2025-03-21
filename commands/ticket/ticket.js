const { SlashCommandBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
// eslint-disable-next-line no-undef
const configPath = path.join(__dirname, '../../config.json');
let { ticketCount, ticketCategoryId, moderatorRole, verifyRole } = require(configPath);


async function createTicket(interaction) {
    try {
        const data = await fs.readFile("ticketsData.json", "utf8");
        const ticketData2 = JSON.parse(data);

        // Check if the user already has an open ticket
        const existingTicket = Object.values(ticketData2).find(
            (ticket) => ticket.authorId === interaction.user.id
        );

        if (existingTicket) {
            await interaction.reply("You already have an open ticket!", { ephemeral: true });
            return;
        }

        // Generate ticket number
        const ticketNumber = ticketCount + 1;
        ticketCount++;

        // Update config file
        const config = require(configPath);
        config.ticketCount = ticketCount;
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));

        const format = "rank-request";
        const channelName = `${format}-${ticketNumber}`;

        const channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: ticketCategoryId,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.AttachFiles,
                    ],
                },
                {
                    id: moderatorRole,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: verifyRole,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
            ],
        });
        const ticketData = {
            channelId: channel.id,
            authorId: interaction.user.id,
            ranks: null,
            blockCount: null,
            upvoteCount: null,
            downvoteCount: null,
        };
        
        // Save the new ticket using ticketCount as the identifier
        ticketData2[ticketNumber] = {
            channelId: ticketData.channelId,
            authorId: ticketData.authorId,
            ranks: ticketData.rank,
            blockCount: ticketData.blockCount,
            upvoteCount: ticketData.upvoteCount,
            downvoteCount: ticketData.downvoteCount,
        };
        
        await fs.writeFile("ticketsData.json", JSON.stringify(ticketData2, null, 2));        

        await interaction.reply(`Ticket created! Ticket number: ${ticketNumber}`, { ephemeral: true });

        await channel.send(`
            # This is a reminder to FOLLOW the format. Failure to comply will get your ticket deleted.
            ## ANOTHER REMINDER OF THE FORMAT:
            \`\`\`
**Ticket Information**
- Rank to be requested:
**Creation Information**
- Block Count: 
- Upvote Count (as is): 
- Downvote Count (as is): 
            \`\`\`
# Send it below this message, along with screenshot/video proof. There will be NO edits after your message.
        `);
    } catch (error) {
        console.error("Error creating ticket:", error);
        await interaction.reply("An error occurred while creating your ticket.", { ephemeral: true });
    }
}


async function closeTicket(id, interaction) {
    try {
        // Delete the channel
        const channel = interaction.guild.channels.cache.get(id);
        if (channel) {
            await channel.delete();
        } else {
            await interaction.reply('Channel not found!', { ephemeral: true });
            return;
        }

        // Path to ticketsData.json
        // eslint-disable-next-line no-undef
        const ticketsDataPath = path.join(__dirname, '..', '..', 'ticketsData.json');

        // Read the ticketsData.json file
        const ticketsData = JSON.parse(await fs.readFile(ticketsDataPath, 'utf8'));

        // Extract the ticket ID from the channel name (e.g., "rank-request-1" -> "1")
        const ticketId = channel.name.split('-').pop();

        // Check if the ticket data exists and remove it
        if (ticketsData[ticketId]) {
            delete ticketsData[ticketId]; // Remove the ticket data

            // Write the updated data back to ticketsData.json
            await fs.writeFile(ticketsDataPath, JSON.stringify(ticketsData, null, 2), 'utf8');
            if (interaction) {
                await interaction.reply("Ticket deleted.")
            }
        } else {
            await interaction.reply('Ticket data not found!', { ephemeral: true });
        }
    } catch (error) {
        console.error('Error closing ticket:', error);
        await interaction.reply('An error occurred while closing the ticket.', { ephemeral: true });
    }
}
module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('The ticket system.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('open')
                .setDescription('Create a ticket.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close a ticket.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The ticket you want to delete.')
                        .setRequired(true)
                )

        ),
    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'open') {
            await createTicket(interaction);
        }
        else if (interaction.options.getSubcommand() === 'close') {
            // validate if the channel starts with rank-request
            const channel = interaction.options.getChannel('channel');
            if (channel.name.startsWith('rank-request')) {
                await closeTicket(channel.id, interaction);
                return
            }
            else {
                await interaction.reply('This is not a ticket channel.', { ephemeral: true });
                return
            }

        }
    }
}