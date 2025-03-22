/* eslint-disable no-undef */
const { Client, Events, GatewayIntentBits, Collection, MessageFlags } = require('discord.js');
const { REST, Routes } = require('discord.js');
var { token, mongoDBConnection } = require('./config.json');
const fs = require('node:fs').promises;
const path = require('node:path');
const { MongoClient } = require('mongodb');
const noblox = require('noblox.js');



const mongoClient = new MongoClient(mongoDBConnection, {});

const client = new Client({ intents: [ 
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers
] });
client.commands = new Collection();

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
