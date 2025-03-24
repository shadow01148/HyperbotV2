import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ChatInputCommandInteraction,
  ButtonInteraction,
  User,
  MessageActionRowComponentBuilder,
} from "discord.js";
import { startGame, endGame, isGameActive } from "../../utils/gameManager";
import { start } from "repl";

type Board = (string | null)[][];
type SymbolMap = { [key: string]: string };

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("tictactoe")
    .setDescription("Start a game of Tic-Tac-Toe!")
    .addUserOption((option) =>
      option
        .setName("opponent")
        .setDescription("Choose your opponent")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const playerX: User = interaction.user;
    const playerO: User = interaction.options.getUser("opponent", true);

    if (playerO.bot) {
      await interaction.reply({
        content: "You can't play against a bot!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (playerO.id === playerX.id) {
      await interaction.reply({
        content: "You can't play against yourself!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (isGameActive(playerX.id) || isGameActive(playerO.id)) {
      await interaction.reply({
        content: "Either you or your opponent already have an active game!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const board: Board = Array(3)
      .fill(null)
      .map(() => Array(3).fill(null));
    let currentPlayer: User = playerX;
    const symbol: SymbolMap = { [playerX.id]: "❌", [playerO.id]: "⭕" };

    const message = await interaction.reply({
      content: `Tic-Tac-Toe: **${playerX.username} (❌)** vs **${playerO.username} (⭕)**`,
      components: renderBoard(board),
      fetchReply: true,
    });

    startGame(playerX.id, message.id, "Tic-Tac-Toe");
    startGame(playerO.id, message.id, "Tic-Tac-Toe");

    const collector = message.createMessageComponentCollector({ time: 300000 });

    collector.on("collect", async (button: ButtonInteraction) => {
      try {
        await button.deferUpdate();

        if (button.user.id !== currentPlayer.id) {
          await button.followUp({
            content: "It's not your turn!",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const [x, y] = button.customId.split("_").slice(1).map(Number);
        if (x === undefined || y === undefined || board[x] === undefined)
          return;
        if (board[x][y] !== null) {
          await button.followUp({
            content: "That spot is already taken!",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        board[x][y] = symbol[currentPlayer.id] ?? null;
        if (checkWin(board, symbol[currentPlayer.id] ?? "")) {
          collector.stop("gameOver");
          endGame(message.id);
          await button.message.edit({
            content: `🎉 **${currentPlayer.username} wins!**`,
            components: renderBoard(board, true),
          });
          return;
        }

        if (board.flat().every((cell) => cell !== null)) {
          collector.stop("gameOver");
          endGame(message.id);
          await button.message.edit({
            content: "😐 It's a draw!",
            components: renderBoard(board, true),
          });
          return;
        }

        currentPlayer = currentPlayer.id === playerX.id ? playerO : playerX;
        await button.message.edit({
          content: `Tic-Tac-Toe: **${playerX.username} (❌)** vs **${playerO.username} (⭕)**\n${currentPlayer.username}'s turn (${symbol[currentPlayer.id]})`,
          components: renderBoard(board),
        });
      } catch (error) {
        console.error("Error processing Tic-Tac-Toe move:", error);
      }
    });

    collector.on("end", (_, reason) => {
      if (reason !== "gameOver") {
        endGame(playerX.id);
        endGame(playerO.id);
      }
    });
  },
};

function renderBoard(
  board: Board,
  gameOver: boolean = false,
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  return board.map((row, x) => {
    const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();
    row.forEach((cell, y) => {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`tile_${x}_${y}`)
          .setLabel(cell || "⬜")
          .setStyle(cell ? ButtonStyle.Secondary : ButtonStyle.Primary)
          .setDisabled(gameOver || cell !== null),
      );
    });
    return actionRow;
  });
}

function checkWin(board: Board, playerSymbol: string): boolean {
  return (
    board.some((row) => row.every((cell) => cell === playerSymbol)) ||
    board[0]?.some((_, col) =>
      board.every((row) => row[col] === playerSymbol),
    ) ||
    board.every((row, idx) => row[idx] === playerSymbol) ||
    board.every((row, idx) => row[2 - idx] === playerSymbol)
  );
}
