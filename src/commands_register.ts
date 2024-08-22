import { REST, Routes, } from 'discord.js'
import fs                from 'fs';
import path              from 'path';
import 'dotenv/config';

if (process.env.DISCORD_TOKEN === undefined) {
  throw new Error('The DISCORD_TOKEN environment variable is not defined.');
}

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN)

console.log('Started refreshing application (/) commands.');

const commands = [];

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandFiles = fs.readdirSync(path.join(foldersPath, folder));

  for (const file of commandFiles) {
    const command = require(`./commands/${folder}/${file}`).default;
    commands.push(command.data.toJSON());
  }
}

void submitCommands(commands);


async function submitCommands(commands: any[]) {


  try {
    if (process.env.CLIENT_ID === undefined) {
      throw new Error('The CLIENT_ID environment variable is not defined.');
    }

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}
