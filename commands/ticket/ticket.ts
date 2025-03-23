import { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction } from 'discord.js';
import { promises as fs } from 'fs';
import path from 'path';

// eslint-disable-next-line no-undef
const ticketsDataPath = path.join(__dirname, '../../ticketsData.json');

interface Ticket {
    authorId: string;
    ranks: string[];
    blockCount: number;
    upvoteCount: number;
    downvoteCount: number;
}

async function createTicket(interaction: ChatInputCommandInteraction) {
    try {
        const data = await fs.readFile(ticketsDataPath, 'utf8');
        const ticketData2 = JSON.parse(data);

        // Check if the user already has an open ticket
        const existingTicket = Object.values(ticketData2 as Record<string, Ticket>).find(
            (ticket) => ticket.authorId === interaction.user.id
        );

        if (existingTicket) {
            await interaction.reply({content: "You already have an open ticket!", flags: MessageFlags.Ephemeral });
            return;
        }

        const rankInput = interaction.options.getString('rank') ?? '';
        const ranks = rankInput.split(',').map(r => r.trim());
        const blockCount = interaction.options.getInteger('blocks');
        const upvoteCount = interaction.options.getInteger('upvotes');
        const downvoteCount = interaction.options.getInteger('downvotes');

        // Generate ticket number
        const ticketNumber = Object.keys(ticketData2).length + 1;
        
        // Save the new ticket
        ticketData2[ticketNumber] = {
            authorId: interaction.user.id,
            ranks,
            blockCount,
            upvoteCount,
            downvoteCount,
        };
        
        await fs.writeFile(ticketsDataPath, JSON.stringify(ticketData2, null, 2));        

        await interaction.reply({content: `Ticket created! Ticket number: ${ticketNumber}`, flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error("Error creating ticket:", error);
        await interaction.reply({content: `An error occurred while creating your ticket.`, flags: MessageFlags.Ephemeral });
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Rank request commands.')
        .addSubcommand(subcommand =>
            subcommand.setName('request')
                .setDescription('Create a rank request.')
                .addStringOption(option =>
                    option.setName('rank')
                        .setDescription('The rank to be requested. Separate with commas if you want multiple ranks.')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('blocks')
                        .setDescription('Block count of the creation.')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('upvotes')
                        .setDescription('Upvote count (as is).')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('downvotes')
                        .setDescription('Downvote count (as is).')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('close')
                .setDescription('Close a rank request..')
                .addIntegerOption(option =>
                    option.setName('ticketnumber')
                        .setDescription('The ticket number to close.')
                        .setRequired(true)
                )
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.options.getSubcommand() === 'request') {
            await createTicket(interaction);
        } else if (interaction.options.getSubcommand() === 'close') {
            // Close ticket
            const ticketNumber = interaction.options.getInteger('ticketnumber');
            if (ticketNumber === null) {
                await interaction.reply({content: 'Invalid ticket number.', flags: MessageFlags.Ephemeral });
                return;
            }
            try {
                const data = await fs.readFile(ticketsDataPath, 'utf8');
                const ticketData2 = JSON.parse(data);

                if (!ticketData2[ticketNumber]) {
                    await interaction.reply({content: `Ticket number ${ticketNumber} not found.`, flags: MessageFlags.Ephemeral });
                    return;
                }

                delete ticketData2[ticketNumber];

                await fs.writeFile(ticketsDataPath, JSON.stringify(ticketData2, null, 2));
                await interaction.reply({content: `Ticket number ${ticketNumber} closed.`, flags: MessageFlags.Ephemeral });
            } catch (error) {
                console.error("Error closing ticket:", error);
                await interaction.reply({content: `An error occurred while closing the ticket.`, flags: MessageFlags.Ephemeral });
            }
        }
    }
};
