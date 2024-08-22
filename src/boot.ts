import { Client, Collection, GatewayIntentBits } from 'discord.js';
import fs                                        from 'fs';
import path from 'path';
import 'dotenv/config';

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>;
  }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

// get all commands
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandFiles = fs.readdirSync(path.join(foldersPath, folder));

  for (const file of commandFiles) {
    const command = require(`./commands/${folder}/${file}`).default;
    client.commands.set(command.data.name, command);
  }
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
});

void client.login(process.env.DISCORD_TOKEN);
