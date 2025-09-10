import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { prefix } from '../../../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileName = path.basename(__filename).split('.')[0];

export const setup = {
  permission: 0, // All permission: 0 = all, 1 = owner, 2 = owner, admin group
  group_required: false, // if true command only work on group
};

export const helping = {
  text: "Memakai perlengkapan tempur",
  use: `${prefix[0]}${fileName} *IdItem*`
};

export async function run(ctx, obj) {
  try {
    // Read user data
    const rawUser Data = await fs.readFile('database/userRpg.json', 'utf8');
    const userData = JSON.parse(rawUser Data);

    // Find user
    const user = userData.find(data => data.id === obj.sender.id);
    if (!user) {
      const teks = 'Belum terdaftar di fitur RPG silakan ketik #rpg untuk mengaktifkan fitur RPG';
      await ctx.sendMessage(obj.room.id, { text: teks }, { quoted: obj.message.rawkey });
      return;
    }

    // Parse command and get item id
    const m = obj.message.text.toLowerCase();
    const splitMessage = m.split(' ');
    if (splitMessage.length < 2) {
      await ctx.sendMessage(obj.room.id, { text: 'Mohon sertakan IdItem yang ingin digunakan' }, { quoted: obj.message.rawkey });
      return;
    }
    const itemId = splitMessage[1];

    // Read equipment data
    const rawEquipmentData = await fs.readFile('database/equipmentRpg.json', 'utf8');
    const equipmentData = JSON.parse(rawEquipmentData);

    // Find player's equipment
    const playerEquipment = equipmentData.find(player => player.id === obj.sender.id);
    if (!playerEquipment) {
      await ctx.sendMessage(obj.room.id, { text: 'Player tidak ditemukan' }, { quoted: obj.message.rawkey });
      return;
    }

    // Find the item to use
    const itemToUse = playerEquipment.equipment.find(equip => equip.id == itemId);
    if (!itemToUse) {
      await ctx.sendMessage(obj.room.id, { text: 'Item tidak ditemukan' }, { quoted: obj.message.rawkey });
      return;
    }

    if (itemToUse.use) {
      await ctx.sendMessage(obj.room.id, { text: 'Item sudah digunakan' }, { quoted: obj.message.rawkey });
      return;
    }

    // Unequip currently used item of the same type and remove its stats
    playerEquipment.equipment.forEach(equip => {
      if (equip.type === itemToUse.type && equip.use) {
        equip.use = false;
        user.max_hp -= equip.hp ?? 0;
      }
    });

    // Equip the new item and add its stats
    itemToUse.use = true;
    user.max_hp += itemToUse.hp ?? 0;

    // Update user data array
    const updatedUser Data = userData.map(data => (data.id === user.id ? user : data));
    // Update equipment data array
    const updatedEquipmentData = equipmentData.map(data => (data.id === playerEquipment.id ? playerEquipment : data));

    // Write updated data back to files
    await fs.writeFile('database/userRpg.json', JSON.stringify(updatedUser Data, null, 4), 'utf8');
    await fs.writeFile('database/equipmentRpg.json', JSON.stringify(updatedEquipmentData, null, 2), 'utf8');

    await ctx.sendMessage(obj.room.id, { text: 'Item telah digunakan' }, { quoted: obj.message.rawkey });

  } catch (error) {
    console.error('Error in run function:', error);
    await ctx.sendMessage(obj.room.id, { text: 'Terjadi kesalahan saat menggunakan item' }, { quoted: obj.message.rawkey });
  }
        }
