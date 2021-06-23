const { readFile } = require('fs/promises');
const { join } = require('path');

module.exports = async (dir, file) => {
  try {
    const data = await readFile(join(process.cwd(), dir, file));
    return data;
  } catch (e) {
    return null;
  }
};