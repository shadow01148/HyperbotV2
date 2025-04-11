import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ChatInputCommandInteraction,
  ButtonInteraction,
  MessageActionRowComponentBuilder,
} from "discord.js";
import { startGame, isGameActive, endGame } from "../../utils/gameManager";

type Board = (number | string)[][];
type RevealedBoard = boolean[][];

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("minesweeper")
    .setDescription("Start a game of Minesweeper!")
    .addIntegerOption((option) =>
      option
        .setName("size")
        .setDescription("Grid size (Default: 5)")
        .setMinValue(3)
        .setMaxValue(10),
    )
    .addIntegerOption((option) =>
      option
        .setName("mines")
        .setDescription("Number of mines (Default: 5)")
        .setMinValue(1),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    if (isGameActive(userId)) {
      await interaction.reply({
        content: "You already have an active game!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const size = interaction.options.getInteger("size") ?? 5;
    const mineCount = interaction.options.getInteger("mines") ?? 5;

    const board: Board = generateBoard(size, mineCount);
    const revealed: RevealedBoard = Array.from({ length: size }, () =>
      Array(size).fill(false),
    );

    const reply = await interaction.reply({
      content: "Minesweeper started!",
      components: renderBoard(board, revealed, size),
    });

    startGame(userId, reply.id, "minesweeper");

    // filter
    const collector = reply.createMessageComponentCollector({ time: 300000 });

    collector.on("collect", async (button: ButtonInteraction) => {
      try {
        await button.deferUpdate(); // Prevents expired interactions

        const coords = button.customId.split("_").slice(1).map(Number);
        if (coords.length !== 2) return;
        const [row, col] = coords;

        if (board[row][col] === "💥") {
          await button.message.edit({
            content: `💥 Boom! <@${button.user.id}> hit a mine!`,
            components: renderBoard(board, revealed, size, true),
          });
          collector.stop("gameOver");
          endGame(userId);
        } else {
          reveal(board, revealed, row, col, size);
          await button.message.edit({
            components: renderBoard(board, revealed, size),
          });
        }
      } catch (error) {
        console.error("Error updating interaction:", error);
      }
    });

    collector.on("end", (_, reason) => {
      if (reason !== "gameOver") {
        endGame(userId);
      }
    });
  },
};

function generateBoard(size: number, mineCount: number): Board {
  const board: Board = Array.from({ length: size }, () => Array(size).fill(0));
  const mines: [number, number][] = [];

  while (mines.length < mineCount) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    if (!mines.some(([mx, my]) => mx === x && my === y)) {
      mines.push([x, y]);
      board[x][y] = "💥";
    }
  }

  for (const [mx, my] of mines) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = mx + dx;
        const ny = my + dy;
        if (
          nx >= 0 &&
          ny >= 0 &&
          nx < size &&
          ny < size &&
          board[nx][ny] !== "💥"
        ) {
          board[nx][ny] = (board[nx][ny] as number) + 1;
        }
      }
    }
  }

  return board;
}

function renderBoard(
  board: Board,
  revealed: RevealedBoard,
  size: number,
  gameOver = false,
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (let x = 0; x < size; x++) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let y = 0; y < size; y++) {
      const cell = board[x][y];
      const isRevealed = revealed[x][y];
      const label = isRevealed ? cell.toString() : "⬜";
      const finalLabel = gameOver && cell === "💥" ? "💥" : label;

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`tile_${x}_${y}`)
          .setLabel(finalLabel)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(isRevealed || gameOver),
      );
    }
    rows.push(row);
  }
  return rows;
}

function reveal(
  board: Board,
  revealed: RevealedBoard,
  x: number,
  y: number,
  size: number,
): void {
  if (x < 0 || y < 0 || x >= size || y >= size || revealed[x][y]) return;

  revealed[x][y] = true;

  if (board[x][y] === 0) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        reveal(board, revealed, x + dx, y + dy, size);
      }
    }
  }
}
