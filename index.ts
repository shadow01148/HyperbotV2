import { REST, Routes, Client, Events, GatewayIntentBits, Collection, MessageFlags, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import { token, mongoDBConnection } from './config.json';
import { promises as fs } from 'fs';
import path from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import noblox from 'noblox.js';

interface ExtendedClient extends Client {
    commands: Collection<string, any>;
}

const mongoClient = new MongoClient(mongoDBConnection, {});

const client: ExtendedClient = new Client({
    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers
    ]
}) as ExtendedClient;

client.commands = new Collection();

// Load commands
const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
const foldersPath = path.join(__dirname, 'commands');
async function loadCommands() {
    try {
        const commandFolders = await fs.readdir(foldersPath);
        for (const folder of commandFolders) {
            const commandsPath = path.join(foldersPath, folder);
            const commandFiles = (await fs.readdir(commandsPath)).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const command = await import(filePath); // No need for "file://"

                if (command.default?.data && command.default?.execute) {
                    client.commands.set(command.default.data.name, command.default);
                    console.log(`Command loaded: ${command.default.data.name}`);
                    commands.push(command.default.data.toJSON()); // Add this line to register the command
                } else {
                    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            }
        }
    } catch (error) {
        console.error(`Error loading commands: ${error}`);
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
        const user = await collection.findOne({ _id: new ObjectId(member.id) });

        if (user) {
            // Update the user's roles in the database
            await collection.updateOne(
                { _id: new ObjectId(member.id) },
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
        const user = await collection.findOne({ _id: new ObjectId(member.id) });

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
            if (user['ranks'] && user['ranks'].length > 0) {
                const rolesToAdd = user['ranks'].filter((roleId: string) => member.guild.roles.cache.has(roleId)); // Ensure roles exist in the guild
                await member.roles.add(rolesToAdd);
                console.log(`Assigned saved roles to user ${member.id} (${member.user.tag}):`, rolesToAdd);
            }

            let username = await noblox.getUsernameFromId(user['robloxId'])
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

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

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
