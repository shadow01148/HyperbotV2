/* eslint-disable no-undef */
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const ticketsDataPath = path.join(__dirname, '../../ticketsData.json');

async function createTicket(interaction) {
    try {
        const data = await fs.readFile(ticketsDataPath, 'utf8');
        const ticketData2 = JSON.parse(data);

        // Check if the user already has an open ticket
        const existingTicket = Object.values(ticketData2).find(
            (ticket) => ticket.authorId === interaction.user.id
        );

        if (existingTicket) {
            await interaction.reply("You already have an open ticket!", { ephemeral: true });
            return;
        }

        const ranks = interaction.options.getString('rank').split(',').map(r => r.trim());
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

        await interaction.reply(`Ticket created! Ticket number: ${ticketNumber}`, { ephemeral: true });
    } catch (error) {
        console.error("Error creating ticket:", error);
        await interaction.reply("An error occurred while creating your ticket.", { ephemeral: true });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
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
                .setDescription('Close a ticket.')
                .addIntegerOption(option =>
                    option.setName('ticketnumber')
                        .setDescription('The ticket number to close.')
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'open') {
            await createTicket(interaction);
        }
    }
};
