import { LucideIcon, Pickaxe, Leaf, Skull, Waves, Sparkles, TrendingUp, Package, ShoppingCart, Shield, Sword, Coins, Zap, Gift, User, Users, Map as MapIcon, Compass } from 'lucide-react';

export interface ItemData {
  id: string;
  name: string;
  factoryPrice: number;
  sellPrice: number;
  category: 'Maden' | 'Tarım' | 'Mob' | 'Özel';
  color: string;
  icon: any;
}

export interface NPCTrade {
  id: string;
  npcName: string;
  npcRole: string;
  npcAvatar: string;
  inputItemId: string;
  inputAmount: number;
  outputAmount: number;
  outputType: 'item' | 'money' | 'factory' | 'block';
  outputTargetId: string; // itemId, 'money', factoryId, or blockId
}

export const NPC_TRADES: NPCTrade[] = [
  {
    id: 'trade_1',
    npcName: 'Muhtar Amca',
    npcRole: 'Köy Muhtarı',
    npcAvatar: '👨‍🌾',
    inputItemId: 'bugday',
    inputAmount: 1000,
    outputAmount: 1,
    outputType: 'factory',
    outputTargetId: 'demir'
  },
  {
    id: 'trade_2',
    npcName: 'Kaptan Nemo',
    npcRole: 'Gezgin Tüccar',
    npcAvatar: '⚓',
    inputItemId: 'enderincisi',
    inputAmount: 50,
    outputAmount: 5000000,
    outputType: 'money',
    outputTargetId: 'money'
  },
  {
    id: 'trade_3',
    npcName: 'Usta Kerem',
    npcRole: 'Baş Madenci',
    npcAvatar: '👷',
    inputItemId: 'komur',
    inputAmount: 5000,
    outputAmount: 1,
    outputType: 'factory',
    outputTargetId: 'altin'
  },
  {
    id: 'trade_4',
    npcName: 'Simyacı',
    npcRole: 'Gizemli Bilge',
    npcAvatar: '🧙',
    inputItemId: 'isiktasi',
    inputAmount: 100,
    outputAmount: 1,
    outputType: 'item',
    outputTargetId: 'totem'
  },
  {
    id: 'trade_5',
    npcName: 'Mimar Selim',
    npcRole: 'Baş Mimar',
    npcAvatar: '🏛️',
    inputItemId: 'demir',
    inputAmount: 100,
    outputAmount: 10,
    outputType: 'block',
    outputTargetId: 'brick'
  },
  {
    id: 'trade_6',
    npcName: 'Camcı Veli',
    npcRole: 'Cam Ustası',
    npcAvatar: '💎',
    inputItemId: 'komur',
    inputAmount: 500,
    outputAmount: 5,
    outputType: 'block',
    outputTargetId: 'glass'
  }
];

export interface Rank {
  id: string;
  name: string;
  level: number;
  costFactories: Record<string, number>;
  moneyMultiplier: number;
  dailyReward: number;
  color: string;
  description: string;
}

export const RANKS: Rank[] = [
  {
    id: 'bronz',
    name: 'Bronz Çiftçi',
    level: 1,
    costFactories: { bugday: 10 },
    moneyMultiplier: 1.1, // %10 Bonus
    dailyReward: 5000,
    color: 'text-[#cd7f32]',
    description: 'Vadiye yeni adım atan hevesli bir çiftçi.'
  },
  {
    id: 'gumus',
    name: 'Gümüş İşletmeci',
    level: 2,
    costFactories: { demir: 5, komur: 20 },
    moneyMultiplier: 1.25, // %25 Bonus
    dailyReward: 25000,
    color: 'text-[#c0c0c0]',
    description: 'İşlerini büyütmeye başlamış, tanınan bir sima.'
  },
  {
    id: 'altin',
    name: 'Altın Fabrikatör',
    level: 3,
    costFactories: { altin: 5, elmas: 2 },
    moneyMultiplier: 1.5, // %50 Bonus
    dailyReward: 100000,
    color: 'text-[#ffd700]',
    description: 'Vadi ekonomisine yön veren büyük bir güç.'
  },
  {
    id: 'elmas',
    name: 'Elmas Kralı',
    level: 4,
    costFactories: { zumrut: 5, netherite: 1 },
    moneyMultiplier: 2.0, // %100 Bonus
    dailyReward: 500000,
    color: 'text-[#b9f2ff]',
    description: 'Zenginliğiyle efsanelere konu olan hükümdar.'
  },
  {
    id: 'efsanevi',
    name: 'Efsanevi Kangalf',
    level: 5,
    costFactories: { yildiz: 1 },
    moneyMultiplier: 3.0, // %200 Bonus
    dailyReward: 2000000,
    color: 'text-[#ff00ff]',
    description: 'Vadi tarihinin gördüğü en büyük efsane.'
  }
];

export interface CityStructure {
  id: string;
  name: string;
  cost: number;
  type: 'defense' | 'production' | 'utility';
  bonus: string;
  description: string;
  icon: any;
}

export const CITY_STRUCTURES: CityStructure[] = [
  {
    id: 'watchtower',
    name: 'Gözcü Kulesi',
    cost: 500000,
    type: 'defense',
    bonus: 'Baskın hasarını %20 azaltır.',
    description: 'Düşmanları uzaktan fark etmeni sağlar.',
    icon: Shield
  },
  {
    id: 'granary',
    name: 'Tahıl Ambarı',
    cost: 1000000,
    type: 'utility',
    bonus: 'Tarım üretimini %15 artırır.',
    description: 'Hasat edilen ürünleri daha iyi korur.',
    icon: Package
  },
  {
    id: 'barracks',
    name: 'Kışla',
    cost: 2500000,
    type: 'defense',
    bonus: 'Baskınları %50 ihtimalle savuşturur.',
    description: 'Vadiyi korumak için asker yetiştirir.',
    icon: Sword
  },
  {
    id: 'bank',
    name: 'Vadi Bankası',
    cost: 10000000,
    type: 'utility',
    bonus: 'Satışlardan %10 ekstra kar.',
    description: 'Paranı değerlendirmeni sağlar.',
    icon: Coins
  }
];

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  duration: number; // seconds
  rewardType: 'multiplier' | 'instant';
  rewardValue: number;
  icon: any;
}

export const GAME_EVENTS: GameEvent[] = [
  {
    id: 'coal_rush',
    name: 'Kömür Patlaması',
    description: 'Kömür üretimi 2 katına çıktı!',
    duration: 60,
    rewardType: 'multiplier',
    rewardValue: 2,
    icon: Zap
  },
  {
    id: 'golden_harvest',
    name: 'Altın Hasat',
    description: 'Tüm satışlar %50 daha değerli!',
    duration: 120,
    rewardType: 'multiplier',
    rewardValue: 1.5,
    icon: TrendingUp
  },
  {
    id: 'village_festival',
    name: 'Köy Festivali',
    description: 'Anlık 100.000 TL hediye!',
    duration: 0,
    rewardType: 'instant',
    rewardValue: 100000,
    icon: Gift
  }
];

export interface Worker {
  id: string;
  name: string;
  cost: number;
  multiplier: number;
  description: string;
  icon: any;
}

export const WORKERS: Worker[] = [
  {
    id: 'apprentice',
    name: 'Çırak İşçi',
    cost: 100000,
    multiplier: 1.05,
    description: 'Tüm üretimi %5 artırır.',
    icon: User
  },
  {
    id: 'master',
    name: 'Usta İşçi',
    cost: 500000,
    multiplier: 1.15,
    description: 'Tüm üretimi %15 artırır.',
    icon: Users
  },
  {
    id: 'manager',
    name: 'Vadi Müdürü',
    cost: 2000000,
    multiplier: 1.30,
    description: 'Tüm üretimi %30 artırır.',
    icon: User
  },
  {
    id: 'expert',
    name: 'Uzman Mühendis',
    cost: 10000000,
    multiplier: 1.75,
    description: 'Tüm üretimi %75 artırır.',
    icon: Users
  }
];

export interface MapTile {
  type: 'empty' | 'valley' | 'factory' | 'trader' | 'event' | 'block';
  content?: any;
  blockId?: string;
}

export interface Block {
  id: string;
  name: string;
  price: number;
  color: string;
  icon: any;
}

export const BLOCKS: Block[] = [
  { id: 'dirt', name: 'Toprak', price: 100, color: 'bg-[#8b4513]', icon: Leaf },
  { id: 'stone', name: 'Taş', price: 500, color: 'bg-[#808080]', icon: Pickaxe },
  { id: 'wood', name: 'Odun', price: 1000, color: 'bg-[#a0522d]', icon: Leaf },
  { id: 'brick', name: 'Tuğla', price: 5000, color: 'bg-[#b22222]', icon: Package },
  { id: 'glass', name: 'Cam', price: 10000, color: 'bg-[#add8e6]', icon: Sparkles },
  { id: 'gold_block', name: 'Altın Blok', price: 100000, color: 'bg-[#ffd700]', icon: Coins },
  { id: 'diamond_block', name: 'Elmas Blok', price: 1000000, color: 'bg-[#00ffff]', icon: Sparkles },
];

export const WORLD_COSTS = [0, 5000000, 25000000, 100000000, 500000000];
export const MAP_REFRESH_COST = 50000;

export const ITEMS: ItemData[] = [
  // Madenler
  { id: 'komur', name: 'Kömür', factoryPrice: 50000, sellPrice: 100, category: 'Maden', color: 'bg-[#3d3d3d]', icon: Pickaxe },
  { id: 'bakir', name: 'Bakır', factoryPrice: 75000, sellPrice: 250, category: 'Maden', color: 'bg-[#b87333]', icon: Pickaxe },
  { id: 'demir', name: 'Demir', factoryPrice: 150000, sellPrice: 500, category: 'Maden', color: 'bg-[#d1d1d1]', icon: Pickaxe },
  { id: 'altin', name: 'Altın', factoryPrice: 2500000, sellPrice: 2500, category: 'Maden', color: 'bg-[#ffd700]', icon: Pickaxe },
  { id: 'elmas', name: 'Elmas', factoryPrice: 10000000, sellPrice: 10000, category: 'Maden', color: 'bg-[#00ffff]', icon: Pickaxe },
  { id: 'zumrut', name: 'Zümrüt', factoryPrice: 25000000, sellPrice: 20000, category: 'Maden', color: 'bg-[#50c878]', icon: Pickaxe },
  { id: 'netherite', name: 'Netherite', factoryPrice: 150000000, sellPrice: 150000, category: 'Maden', color: 'bg-[#4d4444]', icon: Pickaxe },
  { id: 'obsidyen', name: 'Obsidyen', factoryPrice: 300000000, sellPrice: 300000, category: 'Maden', color: 'bg-[#1a1a1a]', icon: Pickaxe },
  
  // Tarım
  { id: 'odun', name: 'Odun', factoryPrice: 25000, sellPrice: 50, category: 'Tarım', color: 'bg-[#7b5c3d]', icon: Leaf },
  { id: 'bugday', name: 'Buğday', factoryPrice: 15000, sellPrice: 30, category: 'Tarım', color: 'bg-[#f5deb3]', icon: Leaf },
  { id: 'kaktus', name: 'Kaktüs', factoryPrice: 20000, sellPrice: 40, category: 'Tarım', color: 'bg-[#2e8b57]', icon: Leaf },
  { id: 'sekerkamisi', name: 'Şeker Kamışı', factoryPrice: 30000, sellPrice: 45, category: 'Tarım', color: 'bg-[#90ee90]', icon: Leaf },
  { id: 'kavun', name: 'Kavun', factoryPrice: 40000, sellPrice: 60, category: 'Tarım', color: 'bg-[#ff6347]', icon: Leaf },
  { id: 'balkabagi', name: 'Kabak', factoryPrice: 45000, sellPrice: 70, category: 'Tarım', color: 'bg-[#ffa500]', icon: Leaf },
  
  // Moblar
  { id: 'kemik', name: 'Kemik', factoryPrice: 100000, sellPrice: 150, category: 'Mob', color: 'bg-[#e5e5e5]', icon: Skull },
  { id: 'ip', name: 'İp', factoryPrice: 85000, sellPrice: 120, category: 'Mob', color: 'bg-[#cccccc]', icon: Skull },
  { id: 'deri', name: 'Deri', factoryPrice: 200000, sellPrice: 300, category: 'Mob', color: 'bg-[#8b4513]', icon: Skull },
  { id: 'balcik', name: 'Balçık', factoryPrice: 500000, sellPrice: 1000, category: 'Mob', color: 'bg-[#32cd32]', icon: Skull },
  { id: 'barut', name: 'Barut', factoryPrice: 1000000, sellPrice: 2500, category: 'Mob', color: 'bg-[#696969]', icon: Skull },
  
  // Özel / Nether / End
  { id: 'kuvars', name: 'Kuvars', factoryPrice: 50000000, sellPrice: 5000, category: 'Özel', color: 'bg-[#f0f8ff]', icon: Sparkles },
  { id: 'isiktasi', name: 'Işıktaşı', factoryPrice: 60000000, sellPrice: 7000, category: 'Özel', color: 'bg-[#ffff00]', icon: Sparkles },
  { id: 'enderincisi', name: 'Ender İncisi', factoryPrice: 100000000, sellPrice: 12000, category: 'Özel', color: 'bg-[#008080]', icon: Sparkles },
  { id: 'blaze', name: 'Blaze Çubuğu', factoryPrice: 150000000, sellPrice: 20000, category: 'Özel', color: 'bg-[#ffa500]', icon: Sparkles },
  { id: 'totem', name: 'Totem', factoryPrice: 500000000, sellPrice: 250000, category: 'Özel', color: 'bg-[#ffd700]', icon: Sparkles },
  { id: 'yildiz', name: 'Nether Yıldızı', factoryPrice: 1000000000, sellPrice: 1000000, category: 'Özel', color: 'bg-[#ffffff]', icon: Sparkles },
  { id: 'ejderha_yumurtasi', name: 'Ejderha Yumurtası', factoryPrice: 5000000000, sellPrice: 5000000, category: 'Özel', color: 'bg-[#000000]', icon: Sparkles },
];
