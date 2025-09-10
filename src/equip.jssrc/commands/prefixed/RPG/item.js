import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { prefix } from '../../../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileName = path.basename(__filename).split('.')[0];

export const setup = {
  permission: 0, // All permission: 0 = all, 1 = owner, 2 = owner/admin group
  group_required: false, // if true command only works in group
};

export const helping = {
  text: "Melihat informasi perlengkapan",
  use: `${prefix[0]}${fileName} *IdItem*`
};

export async function run(ctx, obj) {
  try {
    // Read user RPG data
    const rawData = await fs.readFile('database/userRpg.json', 'utf8');
    const userData = JSON.parse(rawData);

    const user = userData.find((data) => data.id === obj.sender.id);

    if (!user) {
      const teks = 'Belum terdaftar di fitur RPG silakan ketik #rpg untuk mengaktifkan fitur RPG';
      return await ctx.sendMessage(
        obj.room.id,
        { text: teks },
        { quoted: obj.message.rawkey }
      );
    }

    const m = obj.message.text.toLowerCase();
    const splitMessage = m.split(' ');

    if (!splitMessage[1]) {
      return await ctx.sendMessage(
        obj.room.id,
        { text: 'Harap masukkan id item kamu bisa melihatnya di *#inventory*' },
        { quoted: obj.message.rawkey }
      );
    }

    // Read equipment data
    const equipmentRaw = await fs.readFile('database/equipmentRpg.json', 'utf8');
    const equipmentData = JSON.parse(equipmentRaw);

    const playerEquipment = equipmentData.find(player => player.id === obj.sender.id);

    if (!playerEquipment) {
      return await ctx.sendMessage(
        obj.room.id,
        { text: 'Player tidak ditemukan' },
        { quoted: obj.message.rawkey }
      );
    }

    const item = playerEquipment.equipment.find(equip => equip.id == splitMessage[1]);

    if (!item) {
      return await ctx.sendMessage(
        obj.room.id,
        { text: 'Item tidak ditemukan' },
        { quoted: obj.message.rawkey }
      );
    }

    const keyMapping = {
      "id": "ID",
      "name": "Nama",
      "type": "Tipe",
      "rarity": "Rarity",
      "use": "Digunakan",
      "level": "Level",
      "hp": "HP",
      "defense": "Defense",
      "power": "Damage",
      "crit_damage": "Damage Crit",
      "additional_stat": "Stat Tambahan",
    };

    let teks = '╓─── Item\n';
    teks += `║ \n`;
    for (const key in item) {
      if (Object.hasOwnProperty.call(item, key)) {
        let value = item[key];
        if (key === "use") {
          value = value ? "Ya" : "Tidak";
        }
        const mappedKey = keyMapping[key] || key;
        teks += `║ ${mappedKey}: ${value}\n`;
      }
    }
    teks += `║ \n`;
    teks += `╙────────────`;

    await ctx.sendMessage(
      obj.room.id,
      { text: teks },
      { quoted: obj.message.rawkey }
    );

  } catch (error) {
    console.error('Error in run function:', error);
    await ctx.sendMessage(
      obj.room.id,
      { text: 'Terjadi kesalahan saat memproses data. Silakan coba lagi nanti.' },
      { quoted: obj.message.rawkey }
    );
  }
}
