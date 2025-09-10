import fs from "fs/promises";
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
    text: "Menampilkan inventori",
    use: `${prefix[0]}${fileName}`
}

export async function run(ctx, obj) {
    try {
        // Read user RPG data
        const invenRaw = await fs.readFile('database/userRpg.json', 'utf8');
        const invenData = JSON.parse(invenRaw);

        // Find user inventory
        const inventory = invenData.find(inven => inven.id === obj.sender.id);

        if (!inventory) {
            const teks = 'Belum terdaftar di fitur RPG silakan ketik #rpg untuk mengaktifkan fitur RPG';
            return await ctx.sendMessage(
                obj.room.id,
                { text: teks },
                { quoted: obj.message.rawkey }
            );
        }

        // Build inventory text
        let teks = '╓─── Inventory\n';
        teks += `║ \n`;
        teks += `║ - Gold : ${inventory.gold}\n`;
        teks += `║ - Iron : ${inventory.iron}\n`;
        teks += `║ - Potion : ${inventory.potion}\n`;
        teks += `║ \n`;
        teks += `╙────────────`;

        // Read equipment data
        const equipmentRaw = await fs.readFile('database/equipmentRpg.json', 'utf8');
        const equipmentData = JSON.parse(equipmentRaw);

        // Find player equipment
        const playerEquipment = equipmentData.find(equipment => equipment.id === obj.sender.id);

        if (playerEquipment && Array.isArray(playerEquipment.equipment) && playerEquipment.equipment.length > 0) {
            teks += '\n\nList equipment: ';
            for (const item of playerEquipment.equipment) {
                teks += `\n`;
                if (item.type === 'weapon') {
                    teks += `╓─── ⚔️\n`;
                } else if (item.type === 'armor') {
                    teks += `╓─── 🛡️\n`;
                } else {
                    teks += `╓─── 🏵️\n`;
                }
                teks += `║ \n`;
                teks += `║ *${item.name}*\n`;
                teks += `║ Rarity: *${item.rarity}*\n`;
                teks += `║ Level: ${item.level}\n`;
                teks += `║ Digunakan : ${item.use === true ? 'ya' : 'tidak'}\n`;
                teks += `║ Id : ${item.id}\n`;
                teks += `║ \n`;
                teks += `╙────────────\n`;
            }
        }

        // Send the inventory message
        await ctx.sendMessage(
            obj.room.id,
            { text: teks }
        );

    } catch (error) {
        console.error('Error processing inventory command:', error);
        await ctx.sendMessage(
            obj.room.id,
            { text: 'Terjadi kesalahan saat memproses inventori. Silakan coba lagi nanti.' },
            { quoted: obj.message.rawkey }
        );
    }
}
