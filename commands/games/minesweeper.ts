import { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  MessageFlags,
  ChatInputCommandInteraction,
  ButtonInteraction,
  MessageActionRowComponentBuilder
} from "discord.js";

type Board = (number | string)[][];
type RevealedBoard = boolean[][];

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export default {
  data: new SlashCommandBuilder()
      .setName("minesweeper")
      .setDescription("Start a game of Minesweeper!")
      .addIntegerOption(option =>
          option.setName("size")
              .setDescription("Grid size (Default: 5)")
              .setMinValue(3)
              .setMaxValue(10)
      )
      .addIntegerOption(option =>
          option.setName("mines")
              .setDescription("Number of mines (Default: 5)")
              .setMinValue(1)
      ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
      const size: number = interaction.options.getInteger("size") ?? 5;
      const mineCount: number = interaction.options.getInteger("mines") ?? 5;

      if (mineCount >= size * size) {
          await interaction.reply({ content: "Too many mines!", flags: MessageFlags.Ephemeral });
          return;
      }

      const board: Board = generateBoard(size, mineCount);
      const revealed: RevealedBoard = Array.from({ length: size }, () => Array(size).fill(false));

      await interaction.reply({ 
          content: "Minesweeper started!", 
          components: renderBoard(board, revealed, size) 
      });

      const collector = interaction.channel!.createMessageComponentCollector({ time: 300000 });

      collector.on("collect", async (button: ButtonInteraction) => {
          const coords = button.customId.split("_").slice(1).map(Number);
          if (coords.length !== 2 || board === undefined) return;
          const [row, col] = coords;
          if (row === undefined || col === undefined) return;
          if (typeof row !== 'number' || typeof col !== 'number') return;
          if (!board || !board[row] || !board[0] || row < 0 || row >= board.length || col < 0 || col >= board[0].length) return;

          if (board[row][col] === "💥") {
              await button.update({ 
                  content: "💥 Boom! You hit a mine!", 
                  components: renderBoard(board, revealed, size, true) 
              });
              collector.stop();
          } else {
              reveal(board, revealed, row, col, size);
              await button.update({ components: renderBoard(board, revealed, size) });
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
      if (!mines.some(([mx, my]) => mx === x && my === y) && board[x] && board[x][y] !== undefined) {
          mines.push([x, y]);
          board[x][y] = "💥";
      }
  }

  for (const [mx, my] of mines) {
      for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
              const nx = mx + dx;
              const ny = my + dy;
              if (nx >= 0 && ny >= 0 && nx < size && ny < size && board[nx] && board[nx][ny] !== "💥") {
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
  gameOver: boolean = false
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  
  for (let x = 0; x < size; x++) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (let y = 0; y < size; y++) {
          if (!board[x] || !revealed[x]) continue;
          const cell = board[x]?.[y];
          const isRevealed = revealed[x]?.[y] ?? false;
          const label = isRevealed && cell !== undefined ? cell.toString() : "⬜";
          const finalLabel = gameOver && cell === "💥" ? "💥" : label;

          row.addComponents(
              new ButtonBuilder()
                  .setCustomId(`tile_${x}_${y}`)
                  .setLabel(finalLabel)
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(isRevealed || gameOver)
          );
      }
      if (row.components.length > 0) {
          rows.push(row);
      }
  }
  return rows;
}

function reveal(board: Board, revealed: RevealedBoard, x: number, y: number, size: number): void {
  if (x < 0 || y < 0 || x >= size || y >= size || !revealed[x] || !board[x]) return;
  if (revealed[x][y]) return;
  
  revealed[x][y] = true;
  
  if (board[x][y] === 0) {
      for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
              reveal(board, revealed, x + dx, y + dy, size);
          }
      }
  }
}
