'use strict';

const ALL_DIGITS = (1 << 9) - 1;
const BASE_SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
  .split('')
  .map(Number);

const TEMPLATES = {
  easy: {
    givens: 40,
    mask: '000110110101001010001100011010011101101000011010001100011011010100111110011000111'
  },
  medium: {
    givens: 34,
    mask: '100101001110100010010001100001000101000100011111110100100000000011011011001101100'
  },
  hard: {
    givens: 28,
    mask: '110111010010000010000000001001010010101001000100110100000001011000001100110100001'
  },
  expert: {
    givens: 24,
    mask: '010101000001001010010100100100000010100001010000110000001001001010000100001010010'
  }
};

function seedFromString(value) {
  let hash = 2166136261 >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function shuffle(values, random) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [values[index], values[target]] = [values[target], values[index]];
  }
  return values;
}

function groupedOrder(random) {
  const groups = shuffle([0, 1, 2], random);
  const order = [];
  for (const group of groups) {
    const offsets = shuffle([0, 1, 2], random);
    for (const offset of offsets) order.push(group * 3 + offset);
  }
  return order;
}

function transpose(values) {
  const output = Array(81).fill(0);
  for (let row = 0; row < 9; row += 1) {
    for (let column = 0; column < 9; column += 1) {
      output[column * 9 + row] = values[row * 9 + column];
    }
  }
  return output;
}

function transformTemplate(template, random) {
  const digitMap = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
  const rows = groupedOrder(random);
  const columns = groupedOrder(random);
  const solution = Array(81).fill(0);
  const mask = Array(81).fill(false);

  for (let row = 0; row < 9; row += 1) {
    for (let column = 0; column < 9; column += 1) {
      const source = rows[row] * 9 + columns[column];
      const target = row * 9 + column;
      solution[target] = digitMap[BASE_SOLUTION[source] - 1];
      mask[target] = template.mask[source] === '1';
    }
  }

  if (random() < 0.5) {
    return {
      solution: transpose(solution),
      mask: transpose(mask)
    };
  }
  return { solution, mask };
}

function solutionCount(input, limit = 2) {
  const grid = input.slice();
  const rowMasks = Array(9).fill(0);
  const columnMasks = Array(9).fill(0);
  const boxMasks = Array(9).fill(0);

  for (let index = 0; index < 81; index += 1) {
    const value = grid[index];
    if (!value) continue;
    const row = Math.floor(index / 9);
    const column = index % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(column / 3);
    const bit = 1 << (value - 1);
    if ((rowMasks[row] & bit) || (columnMasks[column] & bit) || (boxMasks[box] & bit)) return 0;
    rowMasks[row] |= bit;
    columnMasks[column] |= bit;
    boxMasks[box] |= bit;
  }

  let count = 0;
  function search() {
    if (count >= limit) return;
    let bestIndex = -1;
    let bestMask = 0;
    let bestSize = 10;

    for (let index = 0; index < 81; index += 1) {
      if (grid[index] !== 0) continue;
      const row = Math.floor(index / 9);
      const column = index % 9;
      const box = Math.floor(row / 3) * 3 + Math.floor(column / 3);
      const available = ALL_DIGITS & ~(rowMasks[row] | columnMasks[column] | boxMasks[box]);
      const size = available.toString(2).replaceAll('0', '').length;
      if (size === 0) return;
      if (size < bestSize) {
        bestSize = size;
        bestMask = available;
        bestIndex = index;
        if (size === 1) break;
      }
    }

    if (bestIndex === -1) {
      count += 1;
      return;
    }

    const row = Math.floor(bestIndex / 9);
    const column = bestIndex % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(column / 3);
    let available = bestMask;
    while (available && count < limit) {
      const bit = available & -available;
      available ^= bit;
      const value = 32 - Math.clz32(bit);
      grid[bestIndex] = value;
      rowMasks[row] |= bit;
      columnMasks[column] |= bit;
      boxMasks[box] |= bit;
      search();
      rowMasks[row] ^= bit;
      columnMasks[column] ^= bit;
      boxMasks[box] ^= bit;
      grid[bestIndex] = 0;
    }
  }

  search();
  return count;
}

self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'GENERATE') return;
  const started = performance.now();
  const difficulty = Object.hasOwn(TEMPLATES, event.data.difficulty) ? event.data.difficulty : 'medium';
  const template = TEMPLATES[difficulty];
  const seed = String(event.data.seed || 'sudoku-default-seed');

  try {
    const random = mulberry32(seedFromString(seed));
    const { solution, mask } = transformTemplate(template, random);
    const puzzle = solution.map((value, index) => mask[index] ? value : 0);
    const solutions = solutionCount(puzzle, 2);
    if (solutions !== 1) throw new Error(`Template validation expected one solution and found ${solutions}.`);

    self.postMessage({
      type: 'GENERATED',
      requestId: event.data.requestId,
      seed,
      difficulty,
      puzzle,
      solution,
      givens: template.givens,
      generationMs: Math.max(1, Math.round(performance.now() - started)),
      rating: {
        label: `${difficulty[0].toUpperCase()}${difficulty.slice(1)} (estimated)`,
        method: 'prevalidated unique template with clue-count estimate',
        givens: template.givens,
        uniquenessVerified: true
      }
    });
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      requestId: event.data.requestId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
});
