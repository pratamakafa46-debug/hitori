import fs from 'fs/promises';
// Make sure fantasyWeaponNames, fantasyArmorNames, fantasyArtifactNames, weaponDescriptions, armorDescriptions, artifactDescriptions are imported or declared

export async function run(ctx, obj) {
  try {
    // Read user data
    const rawUser Data = await fs.readFile('database/userRpg.json', 'utf8');
    const userData = JSON.parse(rawUser Data);

    const user = userData.find(data => data.id === obj.sender.id);
    if (!user) {
      const teks = 'Belum terdaftar di fitur RPG silakan ketik #rpg untuk mengaktifkan fitur RPG';
      await ctx.sendMessage(obj.room.id, { text: teks }, { quoted: obj.message.rawkey });
      return;
    }

    // Read login data
    const rawLoginData = await fs.readFile('database/login.json', 'utf8');
    const loginData = JSON.parse(rawLoginData);

    if (!loginData.includes(obj.sender.id)) {
      await ctx.sendMessage(obj.room.id, { text: 'Kamu belum login' }, { quoted: obj.message.rawkey });
      return;
    }

    const m = obj.message.text.toLowerCase();
    const splitMessage = m.split(' ');

    if (!splitMessage[1]) {
      let teks = `╓─── Gacha\n`;
      teks += `║ \n`;
      teks += `║ Banner yang tersedia :\n`;
      teks += `║ - Weapon\n`;
      teks += `║ - Armor\n`;
      teks += `║ - Artifact\n`;
      teks += `║ \n`;
      teks += `╙────────────\n\n`;
      teks += `Penggunaan : #gacha *namaBanner*`;

      await ctx.sendMessage(obj.room.id, { text: teks }, { quoted: obj.message.rawkey });
      return;
    }

    // Use the same user object as inventory
    const inventory = user;

    if (inventory.gold < 3000) {
      await ctx.sendMessage(obj.room.id, { text: 'Gold kamu tidak cukup untuk gacha (3000 gold)' }, { quoted: obj.message.rawkey });
      return;
    }

    // Helper: pick rarity based on rates
    function pickRarity() {
      const roll = Math.random() * 100;
      if (roll < 2) return 'legend';
      if (roll < 10) return 'epic'; // 2 + 8
      if (roll < 30) return 'rare'; // 10 + 20
      return 'common';
    }

    // Helper: pick random item from arrays by rarity and type
    function pickRandomItem(type, rarity) {
      let names, descriptions;
      switch (type) {
        case 'weapon':
          names = fantasyWeaponNames;
          descriptions = weaponDescriptions;
          break;
        case 'armor':
          names = fantasyArmorNames;
          descriptions = armorDescriptions;
          break;
        case 'artifact':
          names = fantasyArtifactNames;
          descriptions = artifactDescriptions;
          break;
        default:
          return null;
      }

      const idx = Math.floor(Math.random() * names.length);

      const baseStats = {
        common: { power: 10, defense: 5, hp: 20, critDamage: 5 },
        rare: { power: 30, defense: 15, hp: 50, critDamage: 15 },
        epic: { power: 60, defense: 30, hp: 100, critDamage: 30 },
        legend: { power: 90, defense: 50, hp: 150, critDamage: 50 },
      };

      const stats = baseStats[rarity] || baseStats.common;

      return {
        name: names[idx],
        description: descriptions[idx],
        rarity,
        type,
        power: (type === 'weapon' || type === 'artifact') ? stats.power : 0,
        defense: (type === 'armor' || type === 'artifact') ? stats.defense : 0,
        hp: (type === 'armor' || type === 'artifact') ? stats.hp : 0,
        critDamage: (type === 'weapon' || type === 'artifact') ? stats.critDamage : 0,
        otherStat: Math.random() < 0.5 ? 'None' : Math.floor(Math.random() * 50) + 1,
      };
    }

    const banner = splitMessage[1];
    if (!['weapon', 'armor', 'artifact'].includes(banner)) {
      await ctx.sendMessage(obj.room.id, { text: 'Banner tidak valid. Pilih weapon, armor, atau artifact.' }, { quoted: obj.message.rawkey });
      return;
    }

    const rarity = pickRarity();
    const item = pickRandomItem(banner, rarity);
    if (!item) {
      await ctx.sendMessage(obj.room.id, { text: 'Gagal mendapatkan item.' }, { quoted: obj.message.rawkey });
      return;
    }

    // Deduct gold
    inventory.gold -= 3000;

    // Generate item id
    function generateRandomId() {
      const numbers = '0123456789';
      let randomId = '';
      for (let i = 0; i < 12; i++) {
        if (i === 2 || i === 6) {
          randomId += '-';
        } else {
          randomId += numbers.charAt(Math.floor(Math.random() * numbers.length));
        }
      }
      return randomId;
    }

    const newItem = {
      id: generateRandomId(),
      name: item.name,
      type: item.type,
      rarity: item.rarity,
      use: false,
      level: 1,
      power: item.power,
      crit_damage: item.critDamage,
      defense: item.defense,
      hp: item.hp,
      additional_stat: item.otherStat,
    };

    if (!inventory.equipment) inventory.equipment = [];
    inventory.equipment.push(newItem);

    // Save updated user data
    const updatedUser Data = userData.map(data => (data.id === inventory.id ? inventory : data));
    await fs.writeFile('database/userRpg.json', JSON.stringify(updatedUser Data, null, 4), 'utf8');

    // Prepare message
    let teks = `Anda mendapatkan ${banner} ${item.rarity}\nbernama: ${item.name}\n`;
    teks += `Deskripsi: ${item.description}\n`;
    if (banner === 'weapon') {
      teks += `Kekuatan: ${item.power}\nCritical Damage: ${item.critDamage}\n`;
    } else if (banner === 'armor') {
      teks += `Defense: ${item.defense}\nHP: ${item.hp}\n`;
    } else if (banner === 'artifact') {
      teks += `Kekuatan: ${item.power}\nCritical Damage: ${item.critDamage}\nDefense: ${item.defense}\nHP: ${item.hp}\n`;
    }
    teks += `Statistik Tambahan: ${item.otherStat}\n`;
    teks += `Gold kamu sekarang: ${inventory.gold}`;

    await ctx.sendMessage(obj.room.id, { text: teks }, { quoted: obj.message.rawkey });

  } catch (error) {
    console.error('Error in gacha run:', error);
    await ctx.sendMessage(obj.room.id, { text: 'Terjadi kesalahan saat melakukan gacha.' }, { quoted: obj.message.rawkey });
  }
        }
        
