const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { verifyRole, mongoDBConnection, ROBLOSECURITY } = require('../../config.json');
const { MongoClient } = require('mongodb');
const noblox = require('noblox.js');

const client = new MongoClient(mongoDBConnection, {});

function generateVerificationCode() {
    const words = ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine', 'orange', 'pear', 'quince', 'raspberry', 'strawberry', 'tangerine', 'watermelon'];
    const wordCount = 5;

    for (let i = words.length - 1; i > words.length - 1 - wordCount; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
    }

    return words.slice(-wordCount).join(' ');
}



module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify and link your Roblox account to your Discord account.')
        .addStringOption(option => 
            option
                .setName('username')
                .setDescription('Your Roblox username.')
                .setRequired(true)
        ),

    /**
     * Executes the verification command.
     * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object representing the user's command.
     */
    async execute(interaction) {
        await client.connect();
        const database = client.db('HyperVerify');
        const collection = database.collection('verifiedUsers');
        const username = interaction.options.getString('username');

        var message = await interaction.reply({ content: 'Hold tight...'});
        
        /** @type {number} The Roblox user ID */
        const id = await noblox.getIdFromUsername(username);
        
        /** @type {string} The Discord user ID */
        const discordId = interaction.user.id;

        const user = await collection.findOne({ _id: discordId });
        const ranks = user?.roles || [];
        if (user) {
            if (user.robloxId === id) {
                await message.edit("You are already verified under the same username.", {components: [], embeds: [] })
            }
            const reverifyConfirmation = new EmbedBuilder()
                .setTitle('Reverify')
                .setDescription('You are already verified. Would you like to reverify? This message will timeout in `10 seconds`.')
                .setColor('Blurple');
            const yes = new ButtonBuilder()
                .setStyle(ButtonStyle.Primary)
                .setLabel('Yes')
                .setCustomId('yes');
            await message.edit({ embeds: [reverifyConfirmation], components: [new ActionRowBuilder().addComponents(yes)] });
            const filter = i => i.customId === 'yes' && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 10000 });
            // if yes, continue to the code. if expried, return
            collector.on('collect', async i => {
                if (i.customId === 'yes') {
                    await message.edit({ content: 'Reverifying...', components: [], embeds: [] });
                    await verify(interaction);
                    return;
                }
            });
        } else {
            await verify(interaction);
        }
        async function verify(interaction) {
        /** @param {import('discord.js').ButtonBuilder}*/
        const done = new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setLabel('Done')
            .setCustomId('done');

        const verificationCode = generateVerificationCode()

        const embed = new EmbedBuilder()
            .setTitle('HyperVerify Rewrite Request')
            .setDescription(`Please enter the following code in your Roblox profile's description:\n \`${verificationCode}\` \n\nOnce you have done this, click the button below.`)
            .setColor('Blurple')
            .setTimestamp();
        
        const row = new ActionRowBuilder().addComponents(done);

        const dMessage = await interaction.user.send({ embeds: [embed], components: [row] });
        await message.edit({ content: 'Check your DMs!', components: [] });

        const filter = i => i.customId === 'done' && i.user.id === interaction.user.id;
        const collector = interaction.user.dmChannel.createMessageComponentCollector({ filter, time: 60000 });
        
        collector.on('collect', async i => {
            try {
                if (i.customId === 'done') {

                    const logIn = await noblox.setCookie(ROBLOSECURITY);
                    console.log(`Logged in as ${logIn.name}`);
                    const user = await noblox.getUserInfo(id);
                    const description = user.description;
                    console.log(description);
                    console.log(verificationCode);
                    if (description === verificationCode)  {
                        embed.setDescription('Verification successful. You now have access to the server.');
                        done.setDisabled(true);
                        await dMessage.edit({ embeds: [embed], components: [new ActionRowBuilder().addComponents(done)] });
                        await interaction.member.roles.add(verifyRole).catch(console.error);
                        const database = client.db('HyperVerify');
                        const collection = database.collection('verifiedUsers');
                        await collection.updateOne(
                            { _id: discordId },
                            { $set: { robloxId: id, ranks: ranks }},
                            { upsert: true }
                        );
                        await interaction.member.setNickname(user.name)
                        
                    } else {
                        embed.setDescription('Verification failed. Please make sure you have entered the correct code in your Roblox profile description.');
                        done.setDisabled(true);
                        await dMessage.edit({ embeds: [embed], components: [new ActionRowBuilder().addComponents(done)] });
                    }
                }
            } catch (error) {
                console.log(error)
            }
        });
        }

    },
};
