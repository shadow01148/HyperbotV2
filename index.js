/* eslint-disable no-undef */
const { Client, Events, GatewayIntentBits, Collection, MessageFlags, EmbedBuilder } = require('discord.js');
const { REST, Routes } = require('discord.js');
var { token, ticketCategoryId, ticketCount, mongoDBConnection } = require('./config.json');
const fs = require('node:fs').promises;
const path = require('node:path');
const { MongoClient } = require('mongodb');
const noblox = require('noblox.js');
const ticketsFilePath = "ticketsData.json"; // Adjust the path if needed



const mongoClient = new MongoClient(mongoDBConnection, {});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function connectDB() {
    try {
        await mongoClient.connect();
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
    }
}

connectDB();

const client = new Client({ intents: [ 
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers
] });
client.commands = new Collection();

function getEligibleRanks(ticketData, rankRequirements) {
    const eligibleRanks = {};
    const totalScore = (ticketData.upvoteCount - ticketData.downvoteCount) - 2;

    for (const [category, requirements] of Object.entries(rankRequirements)) {
        const ranks = [];
        for (const [rank, criteria] of Object.entries(requirements.ranks)) {
            const meetsBlockCount = !criteria.minBlocks || ticketData.blockCount >= criteria.minBlocks;
            const meetsScore = !criteria.minScore || totalScore >= criteria.minScore;
            const meetsHallOfFame = !criteria.hallOfFame || totalScore >= 150; // Hall of Fame requires 150+ score

            if (meetsBlockCount && meetsScore && meetsHallOfFame) {
                ranks.push(rank);
            }
        }
        if (ranks.length > 0) {
            eligibleRanks[category] = ranks;
        }
    }

    return eligibleRanks;
}

// Load commands
const commands = [];
const foldersPath = path.join(__dirname, 'commands');

async function loadCommands() {
    const commandFolders = await fs.readdir(foldersPath);
    for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = (await fs.readdir(commandsPath)).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON()); // Add this line to register the command
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}
    }
}
    

loadCommands();

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);

    // Register commands after client is ready
    const rest = new REST().setToken(token);
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(readyClient.user.id),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) {
        return;
    }

    // Check if the message is in the correct ticket category
    if (message.channel.parentId !== ticketCategoryId) {
        return;
    }

    try {
        const data = await fs.readFile('ticketsData.json', 'utf8');
        const ticketData2 = JSON.parse(data);
        const channelNumber = message.channel.name.match(/\d+/)[0];
    
        if (ticketData2[channelNumber]) {
            const { rank, blockCount, upvoteCount, downvoteCount } = ticketData2[channelNumber];
    
            // If all fields are filled (not null), return
            if (rank !== null && blockCount !== null && upvoteCount !== null && downvoteCount !== null) {
                return;
            }
        }
    } catch (error) {
        console.error("Error reading or parsing file:", error);
    }
    

    // Split the message content into lines
    const lines = message.content.split('\n');

    // Initialize an object to store the extracted values
    const ticketData = {
        channelId: message.channel.id,
        authorId: message.author.id,
        ranks: null,
        blockCount: null,
        upvoteCount: null,
        downvoteCount: null,
    };

    // Load rank requirements from ranks.json
    const ranksFilePath = path.join(__dirname, 'ranks.json'); // Adjust the path as needed
    const rankRequirements = JSON.parse(await fs.readFile(ranksFilePath, 'utf8'));

    // Define a threshold for what constitutes a "wall of text"
    const MAX_LINES = 20;

    if (lines.length > MAX_LINES) {
        await message.reply("Wall of text detected.");
        await sleep(3000);
        await message.channel.delete();
        return;
    } else {
        // Process the ticket data as usual
        for (const line of lines) {
            if (line.startsWith('- Rank(s) to be requested (separate with commas):')) {
                ticketData.rank = line.split(':')[1].trim().split(',').map(rank => rank.trim());            
            } else if (line.startsWith('- Block Count:')) {
                let value = line.split(':')[1].trim();
                ticketData.blockCount = Number(value);
            } else if (line.startsWith('- Upvote Count (as is):')) {
                let value = line.split(':')[1].trim();
                ticketData.upvoteCount = Number(value);
            } else if (line.startsWith('- Downvote Count (as is):')) {
                let value = line.split(':')[1].trim();
                ticketData.downvoteCount = Number(value);
            }
        }
    }
    
    // Check if all required fields were extracted
    if (!ticketData.rank || !ticketData.blockCount || !ticketData.upvoteCount || !ticketData.downvoteCount) {
        await message.reply('Invalid message format. Make sure that you filled out all fields correctly.');
        return;
    }

    // Check if blockCount exceeds 20,000
    if (ticketData.blockCount > 20000) {
        await message.reply('Invalid block count. Block count cannot exceed 20,000.');
        return;
    }

    // Check if upvoteCount or downvoteCount exceeds 2,000
    if (ticketData.upvoteCount > 2000 || ticketData.downvoteCount > 2000) {
        await message.reply('Invalid vote count. Upvotes and downvotes cannot exceed 2,000.');
        return;
    }

    const eligibleRanks = getEligibleRanks(ticketData, rankRequirements);
    const eligibleRanksText = Object.entries(eligibleRanks)
        .map(([category, ranks]) => `**${category}**: ${ranks.join(', ')}`)
        .join('\n');

        const embed = new EmbedBuilder()
        .setTitle('📝 Rank Request')
        .addFields(
            { 
                name: '🔹 Rank(s) requesting for', 
                value: ticketData.rank.length > 0 ? ticketData.rank.map(rank => `- ${rank}`).join('\n') : "❌ No ranks specified.", 
                inline: false 
            },
            { name: '🔨 Block Count', value: ticketData.blockCount.toLocaleString(), inline: false },
            { name: '👍 Upvotes', value: ticketData.upvoteCount.toLocaleString(), inline: false },
            { name: '👎 Downvotes', value: ticketData.downvoteCount.toLocaleString(), inline: false },
            { name: '🏅 Eligible Ranks', value: eligibleRanksText, inline: false },
            { name: 'Overall, Subtracted Votes', value: ((ticketData.upvoteCount - ticketData.downvoteCount) - 2).toLocaleString(), inline: false }
        )
        
        .setColor(0x00AE86); // You can change the color to whatever you prefer

    // Write the ticket data to ticketsData.json
    await writeTicketDataToFile(ticketData);
    await message.reply({embeds: [embed]})

    // Optional: Notify that no further messages will be processed in this channel
    await message.channel.send('Please wait for further manual verification. They will be with you shortly.');
});

async function writeTicketDataToFile(ticketData) {
    try {
        let existingData = {};
        // Read existing data from the tickets file
        try {
            const fileData = await fs.readFile(ticketsFilePath, "utf-8");
            existingData = JSON.parse(fileData);
        } catch {
            console.log("Creating new ticketsData.json file.");
        }

        // Read and update only ticketCount in config file
        try {
            const configData = await fs.readFile("./config.json", "utf-8");
            const configJson = JSON.parse(configData);
            ticketCount = configJson.ticketCount || 1;
            configJson.ticketCount = ticketCount + 1;

            // Write only the modified ticketCount back
            await fs.writeFile("./config.json", JSON.stringify({ ...configJson, ticketCount: configJson.ticketCount }, null, 2));
        } catch {
            console.log("Config file not found, initializing ticketCount.");
            ticketCount = 1;
            await fs.writeFile("./config.json", JSON.stringify({ ticketCount: 2 }, null, 2));
        }

        // Add the new ticket data with the updated count
        existingData[ticketCount] = ticketData;

        // Write the updated data back to the file
        await fs.writeFile(ticketsFilePath, JSON.stringify(existingData, null, 2));

        console.log(`Ticket #${ticketCount} has been added to ticketsData.json`);
    } catch (error) {
        console.error("Error writing ticket data to file:", error);
    }
}


client.on(Events.GuildMemberRemove, async (member) => {
    try {
        const database = mongoClient.db('HyperVerify');
        const collection = database.collection('verifiedUsers');

        // Filter out the @everyone role and map the remaining roles to their IDs
        const rolesToSave = member.roles.cache
            .filter(role => role.name !== '@everyone') // Exclude @everyone
            .map(role => role.id);

        // If no roles are left after filtering, skip saving
        if (rolesToSave.length === 0) {
            console.log(`User ${member.id} (${member.user.tag}) has no roles to save. Skipping role save.`);
            return;
        }

        // Find the user in the database
        const user = await collection.findOne({ _id: member.id });

        if (user) {
            // Update the user's roles in the database
            await collection.updateOne(
                { _id: member.id },
                { $set: { ranks: rolesToSave } },
            );
            console.log(`Roles saved for user ${member.id} (${member.user.tag}):`, rolesToSave);
        } else {
            console.log(`User ${member.id} (${member.user.tag}) not found in the database.`);
        }
    } catch (error) {
        console.error('Error handling GuildMemberRemove event:', error);
    }
});

client.on(Events.GuildMemberAdd, async (member) => {
    try {
        const database = mongoClient.db('HyperVerify');
        const collection = database.collection('verifiedUsers');

        // Find the user in the database
        const user = await collection.findOne({ _id: member.id });

        if (user) {
            // Assign the "verified" role
            const verifiedRole = member.guild.roles.cache.find(role => role.name === 'Verified');
            if (verifiedRole) {
                await member.roles.add(verifiedRole);
                console.log(`Assigned "verified" role to user ${member.id} (${member.user.tag})`);
            } else {
                console.error(`"verified" role not found in the guild.`);
            }

            // Assign saved roles
            if (user.ranks && user.ranks.length > 0) {
                const rolesToAdd = user.ranks.filter(roleId => member.guild.roles.cache.has(roleId)); // Ensure roles exist in the guild
                await member.roles.add(rolesToAdd);
                console.log(`Assigned saved roles to user ${member.id} (${member.user.tag}):`, rolesToAdd);
            }

            let username = noblox.getUsernameFromId(user.robloxId)
            await member.setNickname(username)

            console.log(`User ${member.id} (${member.user.tag}) has been verified and roles restored.`);
        } else {
            console.log(`User ${member.id} (${member.user.tag}) not found in the database. Skipping verification.`);
        }
    } catch (error) {
        console.error(`Error handling GuildMemberAdd event for user ${member.id} (${member.user.tag}):`, error);
    }
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}
    if (interaction) {
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
            }
        }
    }
});

client.login(token);
