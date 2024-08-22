# Discord bot for the role-playing game Tales of Xadia

## Setup

Create a `.env` file in the root directory with the following content:

```
DISCORD_TOKEN=your-discord-token
CLIENT_ID=your-discord-client-id
```

Install the dependencies:

```
pnpm install
```

Register the commands:

```
pnpm run register
```

Run the bot:

```
nodemon
```

## Commands

### Roll

Roll dices in the game Tales of Xadia

Syntax:

```
/roll <dices>
```

Example:

```
/roll 2d6 1d4 1d10
/roll 8 10 12 
/roll 1d10 8 1d12 4
```

It will prompt you to select the dice for total and effect.

![image](https://i.postimg.cc/xC9v2Svy/2024-08-21-224749-hyprshot.png)
