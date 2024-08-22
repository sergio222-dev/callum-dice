import {
  ActionRowBuilder, ButtonBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ButtonStyle, ComponentType, userMention, codeBlock
}             from "discord.js";
import crypto from 'crypto'

interface Dice {
  sides: number;
  result: number;
  id: string;
}

function getResultText(dices: Dice[], selectedDices: string[]): string {
  // sum all selected dices in result
  const selectedDiceSum = dices
    .filter(d => selectedDices.includes(d.id))
    .reduce((acc, cur) => acc + cur.result, 0);

  const selectedDiceValues = dices
    .filter(d => selectedDices.includes(d.id))
    .map(d => d.result)
    .join(', ');

  // get the side of the effect dice
  let selectedEffectDiceSide;
  const effectDiceId = selectedDices.find(id => id.includes('-effect'));
  if (effectDiceId) {
    const effectDice       = dices.find(d => d.id === effectDiceId.replace('-effect', ''));
    selectedEffectDiceSide = effectDice?.sides;
  }

  // get the total of hitches
  const totalHitches = dices
    .reduce((acc, cur) => acc + (cur.result === 1 ? 1 : 0), 0);

  return `Total: ${selectedDiceSum} (${selectedDiceValues}),  Effect: D${selectedEffectDiceSide ?? '4'}  ${totalHitches > 0 ? `Hitches: ${totalHitches}` : ''}`;
}

function rollDice(input: string): Dice[] {
  // Split the input by space to get individual dice rolls
  const diceArray = input.split(' ');

  // Map through each dice notation and process it
  const results = diceArray.map(dice => {

    let quantity: number;
    let sides: number;
    // check if the syntax is xDs or s
    if (!dice.includes('d')) {
      quantity = 1;
      sides = Number(dice);
    } else {
      [quantity, sides] = dice.split('d').map(Number); // Split into quantity and sides
    }

    if (quantity > 200) {
      throw new Error('quantity is too big');
    }

    // Roll the dice and get a random result for each dice
    const rolls = [];
    for (let i = 0; i < quantity; i++) {
      const result = Math.floor(Math.random() * sides) + 1;
      rolls.push({
        sides:  sides,
        result: result,
        id:     crypto.randomUUID().toString(),
      });
    }

    return rolls;
  });

  // Flatten the array and return
  return results.flat();
}

function generateRollSelectorButtons(dices: Dice[], selectedDices: string[]): ActionRowBuilder<ButtonBuilder>[] {
  const normalDicesRows = generateRollDiceButtons(dices, selectedDices);
  const effectDicesRows = generateRollDiceButtons(dices, selectedDices, true);

  return [...normalDicesRows, ...effectDicesRows];
}

function generateRollDiceButtons(dices: Dice[],
                                 selectedDices: string[],
                                 isEffect = false): ActionRowBuilder<ButtonBuilder>[] {
  const arrDiceRows = [];

  // split dices into groups of 5
  const dicesPerRow = 5;
  const diceRows    = Math.ceil(dices.length / dicesPerRow);

  for (let i = 0; i < diceRows; i++) {
    const dicesInRow = dices.slice(i * dicesPerRow, (i + 1) * dicesPerRow);
    const diceRow    = new ActionRowBuilder<ButtonBuilder>();
    dicesInRow.forEach(dice => {
      const diceId = isEffect ? `${dice.id}-effect` : dice.id;

      const isSelected = selectedDices.includes(diceId);

      const button = new ButtonBuilder()
        .setCustomId(isEffect ? `${dice.id}-effect` : dice.id)
        .setLabel(isEffect ? `D${dice.sides}` : `${dice.result}`)
        .setStyle(isSelected ? isEffect ? ButtonStyle.Success : ButtonStyle.Primary : ButtonStyle.Secondary)
      ;

      // dice with result 1 are not selectable
      if (dice.result === 1) {
        button.setDisabled(true);
      }

      diceRow.addComponents(button);
    });

    arrDiceRows.push(diceRow);
  }

  return arrDiceRows;
}

const roll = new SlashCommandBuilder()
  .setName('roll')
  .setDescription('Roll a dice')
  .addStringOption(option =>
    option.setName('dices').setDescription('Dices to roll').setRequired(true))

export default {
  data:    roll,
  execute: async (interaction: ChatInputCommandInteraction) => {

    const inputDice = interaction.options.getString('dices');

    if (!inputDice) {
      await interaction.reply('You need to provide a dice notation');
      return;
    }

    let dices: Dice[]           = [];
    let selectedDices: string[] = [];

    try {
      dices = rollDice(inputDice);

      if (dices.length >= 10) {
        await interaction.reply(`Too many dices, max 20`);
        return;
      }
    } catch (error) {
      await interaction.reply(`Invalid dice notation`);
      return;
    }

    // create rows of dices
    const diceRow = generateRollSelectorButtons(dices, selectedDices);

    // generate ok button
    const okButton = new ButtonBuilder()
      .setCustomId('ok')
      .setLabel('Ok')
      .setStyle(ButtonStyle.Primary)
    ;

    const okRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(okButton);

    const response = await interaction.reply({
      // content: stringResponse,
      components: [...diceRow, okRow],
      ephemeral:  true,
    });

    const user = userMention(interaction.user.id)

    // get all dices
    const dicesRolled      = dices.map(d => `${d.result}(D${d.sides})`).join('   ');
    const dicesRolledBlock = codeBlock(dicesRolled);

    const responseFollowup = await interaction.channel?.send({
      content: `${user} rolled: ${dicesRolledBlock}`,
    })

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time:          60_000
    })

    collector.on('collect', async (i) => {

      if (i.customId === 'ok') {
        // sum all selected dices in result
        const text = getResultText(dices, selectedDices);

        const textBlock = codeBlock(text);

        await responseFollowup?.reply({
          content: textBlock,
        })

        await interaction.deleteReply();

        collector.stop();
        return;
      }

      // check if id has effect or not
      const isEffect = i.customId.includes('-effect');

      if (isEffect) {
        // check if there is an effect dice already selected
        const currentEffectDiceId = selectedDices.find(id => id.includes('-effect'));
        if (currentEffectDiceId) {
          // remove the effect dice
          selectedDices = selectedDices.filter(id => id !== currentEffectDiceId);
        }

        // remove the '-effect' from the id
        const diceId               = i.customId.replace('-effect', '');
        const isNormalDiceSelected = selectedDices.find(id => id === diceId);

        if (isNormalDiceSelected) {
          // remove the normal dice
          selectedDices = selectedDices.filter(id => id !== diceId);
        }

        const dice = dices.find(d => d.id === diceId);
        if (!dice) {
          return;
        }

        selectedDices.push(i.customId);

        const text = getResultText(dices, selectedDices);

        await i.update({
          content:    text,
          components: [...generateRollSelectorButtons(dices, selectedDices), okRow]
        })

        return;
      }

      const dice = dices.find(d => d.id === i.customId);

      if (!dice) {
        return;
      }

      if (selectedDices.includes(dice.id)) {
        selectedDices = selectedDices.filter(id => id !== dice.id);
      } else {
        selectedDices.push(dice.id);
      }

      // sum all selected dices in result
      const text = getResultText(dices, selectedDices);

      await i.update({
        content:    text,
        components: [...generateRollSelectorButtons(dices, selectedDices), okRow]
      })

      return;
    });
  }
};
